import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }

    const document = await DocumentModel.findOne({ _id: documentId, userId });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const currentVersionIndex = document.currentVersion - 1;
    const currentVersion = document.versions[currentVersionIndex];

    if (!currentVersion) {
      return NextResponse.json({ message: 'Current version not found' }, { status: 404 });
    }

    console.log('Loading document fields:', currentVersion.fields);
    
    return NextResponse.json({
      success: true,
      document: {
        id: document._id,
        documentName: document.documentName,
        originalFileName: document.originalFileName,
        currentVersion: document.currentVersion,
        fields: currentVersion.fields || [],
        recipients: document.recipients || [],
        status: document.status,
        fileName: currentVersion.fileName,
        filePath: currentVersion.filePath,
      },
    });
  } catch (error) {
    console.error('Error loading document:', error);
    return NextResponse.json({ message: 'Failed to load document' }, { status: 500 });
  }
}