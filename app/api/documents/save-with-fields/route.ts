import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentName = formData.get('documentName') as string;
    const fieldsData = formData.get('fields') as string;
    const recipientsData = formData.get('recipients') as string;
    const documentId = formData.get('documentId') as string;
    const changeLog = formData.get('changeLog') as string || 'Document updated';

    if (!file || !documentName) {
      return NextResponse.json({ message: 'File and document name are required' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const fields = fieldsData ? JSON.parse(fieldsData) : [];
    const recipients = recipientsData ? JSON.parse(recipientsData) : [];

    if (documentId) {
      // Update existing document with new version
      const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
      if (!existingDoc) {
        return NextResponse.json({ message: 'Document not found' }, { status: 404 });
      }

      const newVersion = existingDoc.currentVersion + 1;
      const newVersionData = {
        version: newVersion,
        pdfData: pdfBuffer,
        fields: fields,
        status: 'draft' as const,
        changeLog: changeLog,
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
    } else {
      // Create new document
      const newDocument = new DocumentModel({
        userId,
        documentName,
        originalFileName: file.name,
        currentVersion: 1,
        versions: [{
          version: 1,
          pdfData: pdfBuffer,
          fields: fields,
          status: 'draft',
          changeLog: 'Initial version created',
        }],
        recipients: recipients,
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