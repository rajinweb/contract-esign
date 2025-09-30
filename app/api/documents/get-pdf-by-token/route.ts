import { NextRequest } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return new Response('Token is required', { status: 400 });
    }

    const document = await DocumentModel.findOne({
      'versions.signingToken': token
    });

    if (!document) {
      return new Response('Invalid or expired signing link', { status: 404 });
    }

    const version = document.versions.find(v => v.signingToken === token);
    if (!version || !version.pdfData) {
      return new Response('PDF not found', { status: 404 });
    }

    // Check if document has expired
    if (version.expiresAt && new Date() > version.expiresAt) {
      return new Response('Document has expired', { status: 410 });
    }

    return new Response(new Uint8Array(version.pdfData), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.documentName}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error fetching PDF:', error);
    return new Response('Internal server error', { status: 500 });
  }
}