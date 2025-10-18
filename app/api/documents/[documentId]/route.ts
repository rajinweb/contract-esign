import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import mongoose from 'mongoose';

type RouteContext = {
  params: Promise<{ documentId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // Auth is optional here; some logic paths don't require a logged-in user (e.g., token-based access).
    // We call getAuthSession to connect to DB and get userId if available.
    const userId = await getAuthSession(req);
    const search = req.nextUrl.searchParams;
    const { documentId: paramDocumentId } = await context.params;
    const token = search.get('token');

    let document;

    if (token) {
      // If token is provided, find by token (for signing links - no auth required)
      document = await DocumentModel.findOne({ 'versions.signingToken': token });
    } else if (userId && paramDocumentId && mongoose.Types.ObjectId.isValid(paramDocumentId)) {
      // Otherwise, find by documentId and userId (requires auth)
      document = await DocumentModel.findOne({ _id: paramDocumentId, userId });
    } else {
      // If no token, we must have a userId and a valid documentId
      return NextResponse.json({ message: 'Unauthorized or invalid document identifier' }, { status: 401 });
    }

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Find the correct version to serve
    const versionNumber = search.get('version');
    let version;
    if (token) {
      version = document.versions.find((v: { signingToken: string; }) => v.signingToken === token);
    } else if (versionNumber) {
      version = document.versions[parseInt(versionNumber) - 1];
    } else {
      version = document.versions[document.currentVersion - 1];
    }

    if (!version) {
      return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    }

    if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
      return NextResponse.json({ message: 'Document has expired' }, { status: 410 });
    }

    if (version.pdfData) {
      const pdfArray = new Uint8Array(version.pdfData);
      return new NextResponse(pdfArray, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${document.documentName || 'document'}.pdf"`,
        },
      });
    } else if (version.filePath && fs.existsSync(version.filePath)) {
      const fileBuffer = fs.readFileSync(version.filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${version.documentName || 'document.pdf'}"`,
        },
      });
    } else {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error in GET /api/documents/[documentId]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}