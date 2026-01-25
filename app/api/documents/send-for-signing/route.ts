import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { sendSigningRequestEmail } from '@/lib/email';
import { updateDocumentStatus } from '@/lib/statusLogic';
import { Recipient } from '@/types/types';

// POST - Send a document for signing
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, recipients, subject, message, sequentialSigning } = await req.json();

    if (!documentId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ message: 'Document ID and recipients are required' }, { status: 400 });
    }

    const document = await DocumentModel.findOne({ _id: documentId, userId });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    document.sequentialSigning = !!sequentialSigning;

    // Determine initial status based on sequential signing
    let minOrder = Infinity;
    if (sequentialSigning) {
      minOrder = Math.min(...recipients.filter((r: Recipient) => r.role !== 'viewer').map((r: Recipient) => r.order));
    }

    // Update document status and recipients
    document.recipients = recipients.map((r: Recipient) => {
      let status = 'sent';
      if (sequentialSigning && r.role !== 'viewer' && r.order > minOrder) {
        status = 'pending';
      }
      return { ...r, status };
    });

    updateDocumentStatus(document);

    // Get or create the current version with signing token
    const currentVersion = document.versions && document.versions.length > 0
      ? document.versions[document.versions.length - 1]
      : null;

    if (!currentVersion) {
      return NextResponse.json({ message: 'No document version found' }, { status: 404 });
    }

    // Generate a cryptographically secure signing token for the version
    if (!currentVersion.signingToken) {
      currentVersion.signingToken = crypto.randomBytes(32).toString('hex');
      currentVersion.sentAt = new Date();
    }

    await document.save();

    // Send signing request emails only to active recipients
    for (const recipient of document.recipients) {
      if (recipient.status === 'sent' || recipient.role === 'viewer') {
        await sendSigningRequestEmail(recipient, document, { subject, message }, currentVersion.signingToken);
      }
    }

    return NextResponse.json({ message: 'Document sent for signing' });
  } catch (error) {
    console.error('API Error in POST /api/documents/send-for-signing', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}