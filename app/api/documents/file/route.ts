import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ message: 'Missing documentId' }, { status: 400 });
    }

    // Fetch document from DB
    const doc = await DocumentModel.findOne({ _id: documentId, userId });
    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const currentVersion = doc.versions[doc.currentVersion - 1];
    if (!currentVersion || !currentVersion.filePath) {
      return NextResponse.json({ message: 'File not found for document' }, { status: 404 });
    }

    const filePath = currentVersion.filePath;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: 'File missing on server' }, { status: 404 });
    }

    // Stream file
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(currentVersion.documentName || 'document.pdf')}"`,
      },
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ message: 'Error fetching file' }, { status: 500 });
  }
}
