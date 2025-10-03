import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// --- Helper Types (for type safety) ---
type VersionType = {
  version: number;
  pdfData: Buffer;
  filePath: string;
  fileName: string;
  fields: Array<{
    id?: string;
    [k: string]: unknown;
  }>;
  status: 'draft' | 'save' | 'final' | 'sent' | 'error';
  changeLog: string;
  createdAt: Date;
  updatedAt: Date;
  signingToken?: string;
  expiresAt?: Date;
};

// --- Helper Functions ---

function sanitizeFileName(name: string): string {
  // Simple sanitation to prevent path traversal/invalid characters
  return name.replace(/[<>:"/\\|?*]+/g, '').trim();
}

function ensurePdfExtension(name: string) {
  if (!name) return 'document.pdf';
  const trimmed = name.trim();
  if (path.extname(trimmed).toLowerCase() === '.pdf') return trimmed;
  return `${trimmed}.pdf`;
}

/**
 * Generates a unique file path by appending '_copy_#' if the file already exists.
 * This should ONLY be used for initial save or version creation (corruption fix).
 */
/**
 * Write a stable file path for a PDF: prefer sanitized base name, try version suffix
 * only when necessary. Returns the actual path and file name written (or reused).
 */
function writeFileStable(dir: string, baseFileName: string, pdfBuffer: Buffer, preferredVersion?: number): { filePath: string; finalFileName: string } {
  const safeBaseName = sanitizeFileName(baseFileName);
  const ext = path.extname(safeBaseName) || '.pdf';
  const nameWithoutExt = path.basename(safeBaseName, ext);

  // candidate for initial (no suffix)
  const tryPaths: string[] = [];

  if (preferredVersion && preferredVersion > 1) {
    tryPaths.push(path.join(dir, `${nameWithoutExt}_v${preferredVersion}${ext}`));
  }

  tryPaths.push(path.join(dir, safeBaseName));

  // fallback: incremental _vN
  for (let i = 1; i <= 100; i++) {
    tryPaths.push(path.join(dir, `${nameWithoutExt}_v${i}${ext}`));
  }

  for (const p of tryPaths) {
    try {
      if (!fs.existsSync(p)) {
        // write and return
        fs.writeFileSync(p, pdfBuffer);
        return { filePath: p, finalFileName: path.basename(p) };
      }
      // if exists, compare content; if identical reuse
      const existing = fs.readFileSync(p);
      if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
        return { filePath: p, finalFileName: path.basename(p) };
      }
    } catch {
      continue;
    }
  }

  // As a last resort, write with timestamp suffix
  const tsName = `${nameWithoutExt}_${Date.now()}${ext}`;
  const finalPath = path.join(dir, tsName);
  fs.writeFileSync(finalPath, pdfBuffer);
  return { filePath: finalPath, finalFileName: tsName };
}

// Write file deterministically for a document using its id and version
function writeFileForDocument(dir: string, documentId: string, version: number, pdfBuffer: Buffer): { filePath: string; finalFileName: string } {
  const ext = '.pdf';
  const fileName = `${documentId}_v${version}${ext}`;
  const filePath = path.join(dir, fileName);
  try {
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath);
      if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
        return { filePath, finalFileName: fileName };
      }
    }
    fs.writeFileSync(filePath, pdfBuffer);
    return { filePath, finalFileName: fileName };
  } catch {
    return writeFileStable(dir, `${documentId}_v${version}.pdf`, pdfBuffer, version);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    // Use null for better type safety when retrieving Form Data
    const file = formData.get('file') as File | null;
    const documentName = formData.get('documentName') as string | null;
    const fieldsData = formData.get('fields') as string | null;
    const recipientsData = formData.get('recipients') as string | null;
    const documentId = formData.get('documentId') as string | null;
    const changeLog = (formData.get('changeLog') as string) || 'Document content updated';

    if (!file || !documentName) return NextResponse.json({ message: 'File and document name are required' }, { status: 400 });

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    const requestedFileName = formData.get('fileName') as string | null;
    const normalizedRequestedFileName = requestedFileName ? ensurePdfExtension(requestedFileName) : null;

    // The user's specific uploads directory
    const userDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(userDir, { recursive: true });


    // ------------------------- UPDATE EXISTING DOCUMENT -------------------------
    if (documentId) {
      // Find the document instance
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

      // Identify the current version and its index
      const currentVersionIndex = existingDoc.versions.findIndex((v: VersionType) => v.version === existingDoc.currentVersion);
      const latestVersion: VersionType = existingDoc.versions[currentVersionIndex];
      if (!latestVersion) return NextResponse.json({ message: 'No versions found for document' }, { status: 404 });

      const isOpenSession = latestVersion.status === 'draft' || latestVersion.status === 'save';

      // --- SCENARIO 1: CONTINUOUS SAVE (Overwrite Current Draft) ---
      if (isOpenSession) {

        let overwritePath = latestVersion.filePath;
        let changesDetected = false;
        let corruptionFixed = false;
        let wroteDuringHealing = false;

        const renameRequested = Boolean(normalizedRequestedFileName && normalizedRequestedFileName !== latestVersion.fileName);

        // **CORRUPTION CHECK & SELF-HEALING FALLBACK**
        // This block runs if the path is missing or the file on disk is gone.
        if (!overwritePath || !fs.existsSync(overwritePath)) {
          console.warn(`Document ID ${documentId}, Version ${latestVersion.version} is missing or invalid filePath. Triggering self-healing...`);

          // Recreate the user's original filename path. Prefer the stored fileName or originalFileName.
          try {
            const desiredName = ensurePdfExtension(latestVersion.fileName || existingDoc.originalFileName || file.name || 'document');
            const candidate = path.join(userDir, desiredName);
            // Overwrite or create the candidate file with the incoming buffer
            fs.writeFileSync(candidate, pdfBuffer);
            overwritePath = candidate;
            latestVersion.filePath = candidate;
            latestVersion.fileName = desiredName;
            corruptionFixed = true;
            wroteDuringHealing = true;
            changesDetected = true;
            console.info(`Self-healed by writing original filename: ${candidate}`);
          } catch {
            console.warn('Writing original filename failed, falling back to deterministic writer');
            const { filePath: newOverwritePath, finalFileName: newFileName } = writeFileForDocument(userDir, String(existingDoc._id), latestVersion.version, pdfBuffer);
            overwritePath = newOverwritePath;
            latestVersion.filePath = newOverwritePath;
            latestVersion.fileName = newFileName;
            corruptionFixed = true;
            wroteDuringHealing = true;
            changesDetected = true;
            console.info(`Self-healed using deterministic writer: ${newOverwritePath}`);
          }
          const existingFieldsStr = JSON.stringify((latestVersion.fields || []).slice().sort((a: { id?: string }, b: { id?: string }) => (a.id || '').localeCompare(b.id || '')));
          const incomingFieldsStr = JSON.stringify((fields || []).slice().sort((a: { id?: string }, b: { id?: string }) => (a.id || '').localeCompare(b.id || '')));
          if (existingFieldsStr !== incomingFieldsStr) changesDetected = true;

          // Check for PDF content change compared to the stored pdfData buffer
          if (latestVersion.pdfData && Buffer.isBuffer(latestVersion.pdfData)) {
            if (!Buffer.from(latestVersion.pdfData).equals(pdfBuffer)) {
              changesDetected = true;
            }
          } else {
            // If no pdfData in DB, be conservative and treat as changed
            changesDetected = true;
          }
        }

        if (!changesDetected) {
          // Provide current file metadata so client can keep filename in UI
          const currentPath = latestVersion.filePath || (existingDoc.originalFileName ? path.join(userDir, existingDoc.originalFileName) : undefined);
          const fileUrl = currentPath ? `/api/documents/file?path=${encodeURIComponent(currentPath)}` : undefined;
          const fileNameResp = latestVersion.fileName || existingDoc.originalFileName || path.basename(file.name || 'document');
          return NextResponse.json({
            success: true,
            documentId: existingDoc._id,
            version: existingDoc.currentVersion,
            fileUrl,
            fileName: fileNameResp,
            message: `No relevant changes detected. Session maintained.`,
          });
        }

        // --- CONTINUOUS SAVE EXECUTION ---
        // 1. If the user requested a rename, write the new active filename; if not, overwrite the existing filePath.
        if (renameRequested) {
          console.debug(`User requested rename for doc ${documentId}: ${normalizedRequestedFileName}`);
          // If user explicitly renamed, write to the new filename (overwrite if exists)
          const desired = normalizedRequestedFileName as string;
          const candidate = path.join(userDir, desired);
          fs.writeFileSync(candidate, pdfBuffer);
          overwritePath = candidate;
          latestVersion.filePath = candidate;
          latestVersion.fileName = desired;
          wroteDuringHealing = true; // already written
          console.debug(`Wrote renamed file: ${candidate}`);
        } else {
          // Overwrite the user's original filename (do not create an _active file)
          const desiredName = latestVersion.fileName || existingDoc.originalFileName || ensurePdfExtension(documentName || file.name || 'document');
          const candidate = path.join(userDir, desiredName);
          try {
            fs.writeFileSync(candidate, pdfBuffer);
            overwritePath = candidate;
            latestVersion.filePath = candidate;
            latestVersion.fileName = desiredName;
            console.debug(`Overwrote original filename for doc ${documentId}: ${candidate}`);
          } catch {
            // fallback to existing overwritePath behavior
            if (!wroteDuringHealing) {
              console.debug(`Overwriting file on disk for doc ${documentId} v${latestVersion.version} -> ${overwritePath}`);
              fs.writeFileSync(overwritePath, pdfBuffer);
            } else {
              console.debug(`File already written during healing for doc ${documentId} v${latestVersion.version} -> ${overwritePath}`);
            }
          }
        }

        const currentVersionNumber = existingDoc.currentVersion;
        const now = new Date();

        // 2. Prepare atomic update data for Mongoose $set operator
        const updateData: Record<string, unknown> = {
          documentName: documentName,
          recipients: recipients,
          updatedAt: now,
        };

        // Use the $set operator with dot notation to atomically update the specific version record
        // This is the most reliable way to update nested array elements.
        updateData[`versions.${currentVersionIndex}.pdfData`] = pdfBuffer;
        updateData[`versions.${currentVersionIndex}.fields`] = fields || [];
        updateData[`versions.${currentVersionIndex}.updatedAt`] = now;
        updateData[`versions.${currentVersionIndex}.status`] = 'draft';
        updateData[`versions.${currentVersionIndex}.changeLog`] = changeLog;

        // Update filePath/fileName when we have a valid overwritePath. If the
        // user did not request a rename, keep the same file name (overwrite).
        if (overwritePath) {
          const finalName = latestVersion.fileName || path.basename(overwritePath);
          updateData[`versions.${currentVersionIndex}.filePath`] = overwritePath;
          updateData[`versions.${currentVersionIndex}.fileName`] = finalName;
          // When the user explicitly renamed, also update the document-level originalFileName
          // so future lookups and UI show the renamed file.
          updateData[`originalFileName`] = finalName;
        }

        // 3. Execute the Atomic Update
        console.debug('Updating DB with version-level data', { documentId, currentVersionIndex, updateKeys: Object.keys(updateData) });
        console.log('Saving fields to database:', fields);
        await DocumentModel.updateOne(
          { _id: documentId, userId: userId },
          { $set: updateData }
        );
        console.debug('DB update complete for', documentId);
        
        // Verify the update was successful
        const updatedDoc = await DocumentModel.findById(documentId);
        const updatedVersion = updatedDoc?.versions[currentVersionIndex];
        console.log('Verified saved fields:', updatedVersion?.fields);

        // Respond with helpful metadata for the client to update UI
        const respPath = overwritePath || latestVersion.filePath;
        const respFileUrl = respPath ? `/api/documents/file?path=${encodeURIComponent(respPath)}` : undefined;
        const respFileName = (latestVersion.fileName || path.basename(respPath || ''));
        return NextResponse.json({
          success: true,
          documentId: existingDoc._id,
          version: currentVersionNumber,
          fileUrl: respFileUrl,
          fileName: respFileName,
          message: corruptionFixed
            ? `Document (v${currentVersionNumber}) healed and saved.`
            : `Document saved successfully (same session, no new version)`,
        });
      }

      // --- SCENARIO 2: NEW VERSION REQUIRED (Session was closed/Finalized) ---
      else {
        // Create a new version file deterministically (document-based naming)
        const newVersion = existingDoc.currentVersion + 1;
        // const baseFileName = existingDoc.originalFileName || file.name;
        // Prefer copying from the latest stored filePath (the working copy)
        // or from the user's originalFileName.
        const candidateSourcePaths: string[] = [];
        if (latestVersion && latestVersion.filePath) candidateSourcePaths.push(latestVersion.filePath);
        if (existingDoc.originalFileName) candidateSourcePaths.push(path.join(userDir, existingDoc.originalFileName));
        // Determine the versioned path we want to create
        const versionedName = `${existingDoc._id}_v${newVersion}.pdf`;
        const versionedPath = path.join(userDir, versionedName);
        let vFilePath = versionedPath;
        let vFileName = versionedName;

        let copied = false;
        for (const src of candidateSourcePaths) {
          try {
            if (fs.existsSync(src)) {
              try {
                fs.copyFileSync(src, versionedPath);
                vFilePath = versionedPath;
                vFileName = versionedName;
                copied = true;
                break;
              } catch {
                continue;
              }
            }
          } catch {
            continue;
          }
        }

        if (!copied) {
          // fallback: write deterministically from buffer
          const res = writeFileForDocument(userDir, String(existingDoc._id), newVersion, pdfBuffer);
          vFilePath = res.filePath;
          vFileName = res.finalFileName;
        }

        const now = new Date();

        existingDoc.versions.push({
          version: newVersion,
          pdfData: pdfBuffer,
          filePath: vFilePath,
          fileName: vFileName,
          fields,
          status: 'draft', // New version starts as a fresh draft
          changeLog,
          createdAt: now,
          updatedAt: now,
        } as VersionType);

        existingDoc.currentVersion = newVersion;
        existingDoc.documentName = documentName;
        existingDoc.recipients = recipients;
        existingDoc.updatedAt = now;

        await existingDoc.save();

        const fileUrl = `/api/documents/file?path=${encodeURIComponent(vFilePath)}`;
        return NextResponse.json({
          success: true,
          documentId: existingDoc._id,
          version: newVersion,
          fileUrl,
          message: `New version created: v${newVersion}`,
        });
      }
    }

    // ------------------------- SAVE NEW DOCUMENT (Initial Version) -------------------------
    else {
      // Create the document instance but don't save yet. Mongoose assigns _id immediately.
      const now = new Date();
      const newDocument = new DocumentModel({
        userId,
        documentName,
        currentVersion: 1,
        versions: [],
        recipients,
        status: 'draft',
        updatedAt: now,
        createdAt: now,
      });

      // Use the user's original filename (or provided documentName) for the
      // working copy instead of using any _active file. Write to
      // uploads/<userId>/<originalFileName>. If that fails, fall back to
      // writeFileStable which will pick a safe filename.
      const finalFileName = ensurePdfExtension(documentName || file.name || 'document');
      const candidatePath = path.join(userDir, finalFileName);
      let filePath = candidatePath;
      try {
        fs.writeFileSync(candidatePath, pdfBuffer);
      } catch {
        const res = writeFileStable(userDir, finalFileName, pdfBuffer);
        filePath = res.filePath;
        newDocument.originalFileName = res.finalFileName;
        newDocument.versions = [{
          version: 1,
          pdfData: pdfBuffer,
          filePath: res.filePath,
          fileName: res.finalFileName,
          fields,
          status: 'draft',
          changeLog: 'Initial version created',
          createdAt: now,
          updatedAt: now,
        }];
        await newDocument.save();
        const fileUrl = `/api/documents/file?path=${encodeURIComponent(res.filePath)}`;
        return NextResponse.json({ success: true, documentId: newDocument._id, version: 1, fileUrl, fileName: res.finalFileName, folder: userId, message: 'Document saved successfully' });
      }

      // If we succeeded writing to the candidate path, use that as the
      // originalFileName and version entry.
      newDocument.originalFileName = finalFileName;
      newDocument.versions = [{
        version: 1,
        pdfData: pdfBuffer,
        filePath,
        fileName: finalFileName,
        fields,
        status: 'draft',
        changeLog: 'Initial version created',
        createdAt: now,
        updatedAt: now,
      }];

      await newDocument.save();

      // Return a fileUrl that the client can fetch
      const fileUrl = `/api/documents/file?path=${encodeURIComponent(filePath)}`;

      return NextResponse.json({
        success: true,
        documentId: newDocument._id,
        version: 1,
        fileUrl,
        fileName: finalFileName,
        folder: userId,
        message: 'Document saved successfully',
      });
    }

  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ message: 'Failed to save document' }, { status: 500 });
  }
}