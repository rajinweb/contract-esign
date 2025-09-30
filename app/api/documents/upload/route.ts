// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Get logged-in user
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentName = formData.get('documentName') as string;
    const fieldsData = formData.get('fields') as string;
    const recipientsData = formData.get('recipients') as string;
    const documentId = formData.get('documentId') as string;
    const changeLog = (formData.get('changeLog') as string) || 'Document updated';

    if (!file || !documentName) {
      return NextResponse.json({ message: 'File and document name are required' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    // --- Save PDF to uploads folder ---
    const userDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(userDir, { recursive: true });

    const folder = crypto.randomBytes(8).toString('hex');
    const folderPath = path.join(userDir, folder);
    fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, file.name);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('PDF saved to:', filePath);
    // --- Update existing document ---
    if (documentId) {
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) {
        return NextResponse.json({ message: 'Document not found' }, { status: 404 });
      }

      const newVersion = existingDoc.currentVersion + 1;
      const newVersionData = {
        version: newVersion,
        pdfData: pdfBuffer,
        filePath, // optional: store disk path
        fields,
        status: 'draft' as const,
        changeLog,
      };

      existingDoc.versions.push(newVersionData);
      existingDoc.currentVersion = newVersion;
      existingDoc.documentName = documentName;
      existingDoc.recipients = recipients;
      existingDoc.updatedAt = new Date();

      await existingDoc.save();

      return NextResponse.json({
        success: true,
        documentId: existingDoc._id,
        version: newVersion,
        message: `Document updated to version ${newVersion}`,
      });
    }

    // --- Create new document ---
    const newDocument = new DocumentModel({
      userId,
      documentName,
      originalFileName: file.name,
      filePath, // optional: store disk path
      currentVersion: 1,
      versions: [
        {
          version: 1,
          pdfData: pdfBuffer,
          fields,
          status: 'draft',
          changeLog: 'Initial version created',
        },
      ],
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
  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json({ message: 'Failed to save document' }, { status: 500 });
  }
}
