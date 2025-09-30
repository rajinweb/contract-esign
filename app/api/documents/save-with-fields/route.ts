// app/api/documents/save-with-fields/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Finds a unique file path using the _copy_# convention.
 */
function getUniqueFilePath(dir: string, baseFileName: string): { filePath: string, finalFileName: string } {
  const ext = path.extname(baseFileName);
  const nameWithoutExt = path.basename(baseFileName, ext);
  let counter = 0;
  let newFileName = baseFileName;
  let fullPath = path.join(dir, newFileName);

  // Check for collision and append _copy_# if needed
  while (fs.existsSync(fullPath)) {
    counter++;
    newFileName = `${nameWithoutExt}_copy_${counter}${ext}`;
    fullPath = path.join(dir, newFileName);

    if (counter > 100) {
      console.error("Too many file copies. Aborting save.");
      throw new Error("File naming collision error.");
    }
  }
  return { filePath: fullPath, finalFileName: newFileName };
}


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentName = formData.get('documentName') as string;
    const fieldsData = formData.get('fields') as string;
    const recipientsData = formData.get('recipients') as string;
    const documentId = formData.get('documentId') as string;
    const changeLog = (formData.get('changeLog') as string) || 'Document content updated';

    if (!file || !documentName) return NextResponse.json({ message: 'File and document name are required' }, { status: 400 });

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    const userDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(userDir, { recursive: true });

    // ------------------------- UPDATE EXISTING DOCUMENT -------------------------
    if (documentId) {
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

      const currentVersionIndex = existingDoc.versions.findIndex(v => v.version === existingDoc.currentVersion);
      const latestVersion = existingDoc.versions[currentVersionIndex];

      // --- Logic for Continuous Save (Same Session) ---
      if (latestVersion && (latestVersion.status === 'draft' || latestVersion.status === 'save')) {

        const overwritePath = latestVersion.filePath;

        // **SAFETY CHECK FOR MISSING FILE PATH**
        if (!overwritePath) {
          console.error(`Document ID ${documentId}, Version ${latestVersion.version} is missing filePath. Forcing creation of new version.`);
          // Set status to force 'New Session' logic below
          latestVersion.status = 'error_missing_path';
          // Continue execution to the New Version Logic below.
        }

        // If overwritePath exists, proceed with dirty check and overwrite
        if (overwritePath) {

          // 1. --- PERFORM DIRTY CHECK ---
          let changesDetected = false;

          if (existingDoc.documentName !== documentName) {
            changesDetected = true;
          }

          // Compare Recipients
          const existingRecipientsStr = JSON.stringify(existingDoc.recipients.map(r => r.email).sort());
          const incomingRecipientsStr = JSON.stringify(recipients.map(r => r.email).sort());
          if (existingRecipientsStr !== incomingRecipientsStr) {
            changesDetected = true;
          }

          // Compare Fields
          const existingFieldsStr = JSON.stringify(latestVersion.fields.sort((a, b) => a.id.localeCompare(b.id)));
          const incomingFieldsStr = JSON.stringify(fields.sort((a, b) => a.id.localeCompare(b.id)));
          if (existingFieldsStr !== incomingFieldsStr) {
            changesDetected = true;
          }

          if (!changesDetected) {
            return NextResponse.json({
              success: true,
              documentId: existingDoc._id,
              version: existingDoc.currentVersion,
              message: `No changes detected in metadata/fields. Session maintained.`,
            });
          }

          // --- CONTINUOUS SAVE EXECUTION (Changes Detected) ---

          // 1. Overwrite the *existing* file on disk (Line 112 fix)
          fs.writeFileSync(overwritePath, pdfBuffer);

          // 2. Update the *existing* version record in the database
          latestVersion.documentName = documentName;
          latestVersion.fields = fields;
          latestVersion.pdfData = pdfBuffer; // Re-added PDF data for schema validation
          latestVersion.changeLog = changeLog;
          latestVersion.updatedAt = new Date();
          latestVersion.status = 'draft';

          // 3. Update top-level document fields
          existingDoc.documentName = documentName;
          existingDoc.recipients = recipients;
          existingDoc.updatedAt = new Date();

          await existingDoc.save();

          return NextResponse.json({
            success: true,
            documentId: existingDoc._id,
            version: existingDoc.currentVersion,
            message: `Document (v${existingDoc.currentVersion}) overwritten (changes saved).`,
          });
        }
      }

      // --- Logic for New Session (New Version) ---
      // This runs if status was not 'draft'/'save', OR if the safety check failed above.
      if (!latestVersion || (latestVersion.status !== 'draft' && latestVersion.status !== 'save')) {

        // 1. Determine a unique file path using the _copy_# convention
        const { filePath: newFilePath, finalFileName: newFileName } = getUniqueFilePath(userDir, file.name);

        // 2. Save the new file to disk
        fs.writeFileSync(newFilePath, pdfBuffer);

        // 3. Create a new version record
        const newVersion = existingDoc.currentVersion + 1;
        existingDoc.versions.push({
          version: newVersion,
          pdfData: pdfBuffer, // Re-added PDF data for schema validation
          filePath: newFilePath,
          fileName: newFileName,
          fields,
          status: 'draft',
          changeLog,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 4. Update top-level document fields
        existingDoc.currentVersion = newVersion;
        existingDoc.documentName = documentName;
        existingDoc.recipients = recipients;
        existingDoc.updatedAt = new Date();

        await existingDoc.save();

        return NextResponse.json({
          success: true,
          documentId: existingDoc._id,
          version: newVersion,
          message: `Document updated to new version ${newVersion}.`,
        });
      }
    }

    // ------------------------- SAVE NEW DOCUMENT (Initial Version) -------------------------
    else {
      // 1. Determine a unique file path using the _copy_# convention
      const { filePath: newFilePath, finalFileName: newFileName } = getUniqueFilePath(userDir, file.name);

      // 2. Save the new file to disk
      fs.writeFileSync(newFilePath, pdfBuffer);

      // 3. Create new document record
      const newDocument = new DocumentModel({
        userId,
        documentName,
        originalFileName: file.name,
        currentVersion: 1,
        versions: [{
          version: 1,
          pdfData: pdfBuffer, // Re-added PDF data for schema validation
          filePath: newFilePath,
          fileName: newFileName,
          fields,
          status: 'draft',
          changeLog: 'Initial version created',
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        recipients,
        status: 'draft',
      });

      await newDocument.save();

      return NextResponse.json({
        success: true,
        documentId: newDocument._id,
        version: 1,
        message: 'Document saved successfully',
      });
    }

  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ message: 'Failed to save document' }, { status: 500 });
  }
}