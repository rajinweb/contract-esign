import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// Reusing helper functions for consistency (you would need to import these from a utils file)
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
// End of helper functions (should be imported in a real app)

// Keep the active working filename as provided by the user (file.name)
function writeActiveFile(dir: string, desiredName: string, pdfBuffer: Buffer): { filePath: string; finalFileName: string } {
  const safe = sanitizeFileName(desiredName || 'document.pdf');
  const ext = path.extname(safe) || '.pdf';
  const base = path.basename(safe, ext);
  let candidate = path.join(dir, `${base}${ext}`);

  try {
    if (!fs.existsSync(candidate)) {
      fs.writeFileSync(candidate, pdfBuffer);
      return { filePath: candidate, finalFileName: path.basename(candidate) };
    }
    const existing = fs.readFileSync(candidate);
    if (Buffer.isBuffer(existing) && existing.equals(pdfBuffer)) {
      return { filePath: candidate, finalFileName: path.basename(candidate) };
    }
    for (let i = 1; i <= 100; i++) {
      const nextName = `${base}_copy_${i}${ext}`;
      const p = path.join(dir, nextName);
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, pdfBuffer);
        return { filePath: p, finalFileName: nextName };
      }
      const ex = fs.readFileSync(p);
      if (Buffer.isBuffer(ex) && ex.equals(pdfBuffer)) {
        return { filePath: p, finalFileName: nextName };
      }
    }
  } catch (err) {
    // fall through
  }
  const tsName = `${base}_${Date.now()}${ext}`;
  const finalPath = path.join(dir, tsName);
  fs.writeFileSync(finalPath, pdfBuffer);
  return { filePath: finalPath, finalFileName: tsName };
}

// No active-file helpers: we will not write any <docId>_active.pdf files.


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      console.warn('upload: missing userId - unauthorized');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log('upload start', { userId });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentName = formData.get('documentName') as string | null;
    const fieldsData = formData.get('fields') as string | null;
    const recipientsData = formData.get('recipients') as string | null;
    const documentId = formData.get('documentId') as string | null;
    const changeLog = (formData.get('changeLog') as string) || 'Manual upload/New final version';

    if (!file || !documentName) return NextResponse.json({ message: 'File and document name are required' }, { status: 400 });

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(await file.arrayBuffer());
    } catch (err) {
      console.error('upload: failed to read file buffer', err);
      return NextResponse.json({ message: 'Invalid file' }, { status: 400 });
    }
    console.log('upload file info', { name: file.name, size: pdfBuffer.length });
    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];
    const requestedFileName = formData.get('fileName') as string | null;

    const userDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(userDir, { recursive: true });

    // ------------------------- UPDATE EXISTING DOCUMENT (ALWAYS NEW VERSION) -------------------------
    if (documentId) {
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

      // write deterministically based on document id and new version number
      const newVersion = existingDoc.currentVersion + 1;
      const detName = `${existingDoc._id}_v${newVersion}.pdf`;
      let detPath = path.join(userDir, detName);
      try {
        fs.writeFileSync(detPath, pdfBuffer);
      } catch (e) {
        // fallback
        const res = writeFileStable(userDir, existingDoc.originalFileName || file.name, pdfBuffer, newVersion);
        detPath = res.filePath; // eslint-disable-line no-param-reassign
      }

      existingDoc.versions.push({
        version: newVersion,
        pdfData: pdfBuffer,
        filePath: detPath,
        fileName: path.basename(detPath),
        fields,
        status: 'final' as const, // Set status to 'final' or another non-draft status
        changeLog,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      existingDoc.currentVersion = newVersion;
      existingDoc.documentName = documentName;
      existingDoc.recipients = recipients;
      existingDoc.updatedAt = new Date();

      await existingDoc.save();

      return NextResponse.json({
        success: true,
        documentId: existingDoc._id,
        version: newVersion,
        message: `New version created and finalized: v${newVersion}`,
      });
    } else {
      // create the document instance (not saved yet) to use its assigned _id for filename
      const newDocument = new DocumentModel({
        userId,
        documentName,
        currentVersion: 1,
        versions: [],
        recipients,
        status: 'final',
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
        status: 'final',
        changeLog,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      await newDocument.save();

      const fileUrl = `/api/documents/file?path=${encodeURIComponent(detPath)}`;
      return NextResponse.json({ success: true, documentId: newDocument._id, version: 1, fileUrl, fileName: finalFileName, folder: userId, message: 'Document saved successfully' });
    }

  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ message: 'Failed to save document' }, { status: 500 });
  }
}