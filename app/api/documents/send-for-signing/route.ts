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

    const { documentId, recipients, subject, message, signingMode: reqSigningMode } = await req.json();

    if (!documentId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ message: 'Document ID and recipients are required' }, { status: 400 });
    }

    const document = await DocumentModel.findOne({ _id: documentId, userId });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    /* ======================================================
      1️⃣ LOCK PREPARED VERSION (CANONICAL PDF)
    ====================================================== */
    const preparedVersion = document.versions.find((v: { label: string; }) => v.label === 'prepared');
    if (!preparedVersion) {
      return NextResponse.json(
        { message: 'Prepared version not found' },
        { status: 400 }
      );
    }

    // ✅ versions only care about immutability
    preparedVersion.locked = true;
    preparedVersion.sentAt = new Date();

    /* ======================================================
       2️⃣ SET SIGNING MODE + STATE
    ====================================================== */
    const signingMode = reqSigningMode || document.signingMode || 'parallel';
    document.signingMode = signingMode;

    if (signingMode === 'sequential') {
      const missingOrder = recipients.some(
        (r: Recipient) => r.role !== 'viewer' && typeof r.order !== 'number'
      );
      if (missingOrder) {
        return NextResponse.json({ message: 'Order is required for sequential signing' }, { status: 400 });
      }

      const signerOrders = recipients
        .filter((r: Recipient) => r.role === 'signer')
        .map((r: Recipient) => r.order);

      document.signingState = {
        currentOrder: Math.min(...signerOrders),
        signingEvents: []
      };
    } else {
      document.signingState = {
        signingEvents: []
      };
    }

    /* ======================================================
       3️⃣ ASSIGN RECIPIENTS + TOKENS
    ====================================================== */
    document.recipients = recipients.map((r: Recipient) => {
      const token = crypto.randomBytes(32).toString('hex');
      let status: 'sent' | 'pending' | 'signed' = 'sent';
      if (signingMode === 'sequential' && r.role !== 'viewer' && r.order !== document.signingState.currentOrder) {
        status = 'pending';
      }

      return {
        ...r,
        signingToken: token,
        status,
        signedAt: null,
        signedVersion: null
      };
    });

    updateDocumentStatus(document);
    await document.save();

    // Send signing request emails only to active recipients
    for (const recipient of document.recipients) {
      if (recipient.status === 'sent' || recipient.role === 'viewer') {
        await sendSigningRequestEmail(recipient, document, { subject, message }, recipient.signingToken);
      }
    }

    return NextResponse.json({ message: 'Document sent for signing', signingMode: document.signingMode });
  } catch (error) {
    console.error('API Error in POST /api/documents/send-for-signing', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}