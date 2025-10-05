import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '').trim();
}
function writeFileStable(dir: string, baseFileName: string, pdfBuffer: Buffer, preferredVersion?: number): { filePath: string; finalFileName: string } {
  const safeBaseName = sanitizeFileName(baseFileName);
  const ext = path.extname(safeBaseName) || '.pdf';
  const nameWithoutExt = path.basename(safeBaseName, ext);

  const tryPaths: string[] = [];
  if (preferredVersion && preferredVersion > 1) {
    tryPaths.push(path.join(dir, `${nameWithoutExt}_v${preferredVersion}${ext}`));
  }
  tryPaths.push(path.join(dir, safeBaseName));
  for (let i = 1; i <= 100; i++) tryPaths.push(path.join(dir, `${nameWithoutExt}_v${i}${ext}`));

  for (const p of tryPaths) {
    try {
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, pdfBuffer);
        return { filePath: p, finalFileName: path.basename(p) };
      }
      const existing = fs.readFileSync(p);
      if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
        return { filePath: p, finalFileName: path.basename(p) };
      }
    } catch {
      continue;
    }
  }
  const tsName = `${nameWithoutExt}_${Date.now()}${ext}`;
  const finalPath = path.join(dir, tsName);
  fs.writeFileSync(finalPath, pdfBuffer);
  return { filePath: finalPath, finalFileName: tsName };
}


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      console.warn('upload: missing userId - unauthorized');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentName = formData.get('documentName') as string | null;
    const fieldsData = formData.get('fields') as string | null;
    const recipientsData = formData.get('recipients') as string | null;
    const documentId = formData.get('documentId') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    const isMetadataOnly = formData.get('isMetadataOnly') === 'true';
    const changeLog = (formData.get('changeLog') as string) || 'Document updated';


    if (!documentName) return NextResponse.json({ message: 'Document name is required' }, { status: 400 });

    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    let pdfBuffer: Buffer | null = null;
    if (file) {
      try {
        pdfBuffer = Buffer.from(await file.arrayBuffer());

      } catch (err) {
        console.error('upload: failed to read file buffer', err);
        return NextResponse.json({ message: 'Invalid file' }, { status: 400 });
      }
    }
    const requestedFileName = formData.get('fileName') as string | null;

    const userDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(userDir, { recursive: true });

    // ------------------------- UPDATE EXISTING DOCUMENT -------------------------
    if (documentId) {
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

      const currentVersionData = existingDoc.versions[existingDoc.currentVersion - 1];
      if (!currentVersionData) {
        return NextResponse.json({ message: 'Current version not found' }, { status: 404 });
      }

      // Generate or reuse session ID
      const currentSessionId = sessionId || existingDoc.currentSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (isMetadataOnly) {
        // METADATA-ONLY UPDATE: Add to edit history without creating new file
        console.log('Metadata-only update for session:', currentSessionId);

        currentVersionData.editHistory = currentVersionData.editHistory || [];
        currentVersionData.editHistory.push({
          sessionId: currentSessionId,
          fields,
          documentName: documentName !== existingDoc.documentName ? documentName : undefined,
          timestamp: new Date(),
          changeLog,
        });

        // Update current version fields and metadata
        currentVersionData.fields = fields;
        currentVersionData.updatedAt = new Date();

        existingDoc.documentName = documentName;
        existingDoc.recipients = recipients;
        existingDoc.currentSessionId = currentSessionId;
        existingDoc.updatedAt = new Date();

        await existingDoc.save();

        return NextResponse.json({
          success: true,
          documentId: existingDoc._id,
          version: existingDoc.currentVersion,
          sessionId: currentSessionId,
          fileUrl: `/api/documents/file?path=${encodeURIComponent(currentVersionData.filePath)}`,
          fileName: currentVersionData.fileName,
          message: 'Metadata updated successfully',
        });
      } else if (pdfBuffer) {
        // PDF provided for existing document
        // Determine whether this belongs to the same active session
        const incomingSessionId = sessionId || existingDoc.currentSessionId || null;

        if (incomingSessionId && existingDoc.currentSessionId && incomingSessionId === existingDoc.currentSessionId) {
          // SAME SESSION: overwrite current version in-place (do NOT create a new version)
          console.log('Overwriting current version within same session:', incomingSessionId);

          const currentVersionIndex = existingDoc.currentVersion - 1;
          const currentVersionData = existingDoc.versions[currentVersionIndex];
          if (!currentVersionData) return NextResponse.json({ message: 'Current version not found' }, { status: 404 });

          // attempt to overwrite at same path if possible
          let detPath = currentVersionData.filePath || path.join(userDir, `${existingDoc._id}_v${existingDoc.currentVersion}.pdf`);
          try {
            fs.writeFileSync(detPath, pdfBuffer);
          } catch {
            const res = writeFileStable(userDir, existingDoc.originalFileName || file!.name, pdfBuffer, existingDoc.currentVersion);
            detPath = res.filePath;
          }

          // update current version content
          currentVersionData.pdfData = pdfBuffer;
          currentVersionData.filePath = detPath;
          currentVersionData.fileName = path.basename(detPath);
          currentVersionData.fields = fields;
          currentVersionData.updatedAt = new Date();

          existingDoc.documentName = documentName;
          existingDoc.recipients = recipients;
          // keep currentSessionId as is (session still active)
          existingDoc.updatedAt = new Date();

          await existingDoc.save();

          return NextResponse.json({
            success: true,
            documentId: existingDoc._id,
            version: existingDoc.currentVersion,
            fileUrl: `/api/documents/file?path=${encodeURIComponent(detPath)}`,
            fileName: path.basename(detPath),
            message: `Current version ${existingDoc.currentVersion} updated (same session)`,
          });
        }

        // Otherwise, NEW VERSION: Create new physical file and version
        console.log('Creating new version with new PDF file');

        const newVersion = existingDoc.currentVersion + 1;
        const detName = `${existingDoc._id}_v${newVersion}.pdf`;
        let detPath = path.join(userDir, detName);

        try {
          fs.writeFileSync(detPath, pdfBuffer);
        } catch {
          const res = writeFileStable(userDir, existingDoc.originalFileName || file!.name, pdfBuffer, newVersion);
          detPath = res.filePath;
        }

        existingDoc.versions.push({
          version: newVersion,
          pdfData: pdfBuffer,
          filePath: detPath,
          fileName: path.basename(detPath),
          fields,
          status: 'final' as const,
          changeLog,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        existingDoc.currentVersion = newVersion;
        existingDoc.documentName = documentName;
        existingDoc.recipients = recipients;
        existingDoc.currentSessionId = null;
        existingDoc.updatedAt = new Date();

        await existingDoc.save();

        return NextResponse.json({
          success: true,
          documentId: existingDoc._id,
          version: newVersion,
          fileUrl: `/api/documents/file?path=${encodeURIComponent(detPath)}`,
          fileName: path.basename(detPath),
          message: `New version ${newVersion} created`,
        });
      } else {
        return NextResponse.json({ message: 'No file provided for new version' }, { status: 400 });
      }
    } else {
      // CREATE NEW DOCUMENT
      if (!pdfBuffer || !file) {
        return NextResponse.json({ message: 'File is required for new document' }, { status: 400 });
      }

      const initialSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newDocument = new DocumentModel({
        userId,
        documentName,
        currentVersion: 1,
        currentSessionId: initialSessionId,
        versions: [],
        recipients,
        status: 'draft',
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      // Try to write using the original filename the user uploaded (do NOT rename)
      // If there is a collision with different content, pick a stable fallback
      // filename via writeFileStable (which will pick _vN or timestamp style names).
      const preferredName = requestedFileName || file.name || documentName || 'document.pdf';
      const candidate = path.join(userDir, preferredName);
      let detPath = candidate;
      let finalFileName = preferredName;
      try {
        if (!fs.existsSync(candidate)) {
          fs.writeFileSync(candidate, pdfBuffer);
        } else {
          const existing = fs.readFileSync(candidate);
          if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
            // identical file already exists — reuse
          } else {
            // collision with different content — choose a stable alternate name
            const res = writeFileStable(userDir, preferredName, pdfBuffer);
            detPath = res.filePath;
            finalFileName = res.finalFileName;
          }
        }
      } catch {
        const res = writeFileStable(userDir, preferredName, pdfBuffer);
        detPath = res.filePath;
        finalFileName = res.finalFileName;
      }

      newDocument.originalFileName = finalFileName;
      newDocument.versions = [{
        version: 1,
        pdfData: pdfBuffer,
        filePath: detPath,
        fileName: finalFileName,
        fields,
        status: 'draft',
        changeLog: 'Initial document creation',
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      console.log('Creating new document with fields:', fields);
      await newDocument.save();

      const fileUrl = `/api/documents/file?path=${encodeURIComponent(detPath)}`;
      return NextResponse.json({
        success: true,
        documentId: newDocument._id,
        version: 1,
        sessionId: initialSessionId,
        fileUrl,
        fileName: finalFileName,
        folder: userId,
        message: 'Document created successfully'
      });
    }

  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ message: 'Failed to save document' }, { status: 500 });
  }
}