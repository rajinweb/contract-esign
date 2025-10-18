import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { sendSigningRequestEmail } from '@/lib/email';

// POST - Send a document for signing
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, recipients, subject, message } = await req.json();

    if (!documentId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ message: 'Document ID and recipients are required' }, { status: 400 });
    }

    const document = await DocumentModel.findOne({ _id: documentId, userId });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Update document status and recipients
    document.status = 'sent';
    document.recipients = recipients;

    // Get or create the current version with signing token
    const currentVersion = document.versions && document.versions.length > 0
      ? document.versions[document.versions.length - 1]
      : null;

    if (!currentVersion) {
      return NextResponse.json({ message: 'No document version found' }, { status: 404 });
    }

    // Generate signing token for the version if not exists
    if (!currentVersion.signingToken) {
      currentVersion.signingToken = `${documentId}-${Date.now()}`;
      currentVersion.sentAt = new Date();
    }

    await document.save();

    // Send signing request emails to each recipient
    for (const recipient of document.recipients) {
      await sendSigningRequestEmail(recipient, document, { subject, message }, currentVersion.signingToken);
    }

    return NextResponse.json({ message: 'Document sent for signing' });
  } catch (error) {
    console.error('API Error in POST /api/documents/send-for-signing', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}