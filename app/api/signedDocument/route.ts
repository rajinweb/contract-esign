import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentRecipient } from '@/models/Document';
import { IDocumentVersion } from '@/types/types';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import { sendSigningRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { recipientId, token, action, location, device, consent } = await req.json();

    if (!token) return NextResponse.json({ message: 'Token is required' }, { status: 400 });

    // Find the document and version that contains this signing token
    const document = await DocumentModel.findOne({
      'versions.signingToken': token,
      'recipients.id': recipientId,
    });
    if (!document) {
      return NextResponse.json({ message: 'Invalid or expired signing link' }, { status: 404 });
    }

    const version = document.versions.find((v: IDocumentVersion) => v.signingToken === token);
    if (!version) return NextResponse.json({ message: 'Version not found' }, { status: 404 });

    // verify expiry
    if (version.expiresAt && new Date() > version.expiresAt) {
      return NextResponse.json({ message: 'Signing link has expired' }, { status: 410 });
    }

    // find recipient
    const recipient = (document.recipients as IDocumentRecipient[] | undefined)?.find((r: IDocumentRecipient) => r.id === recipientId);
    if (!recipient) {
      return NextResponse.json({ message: 'Recipient not found for this document' }, { status: 404 });
    }

    const requiresGps =
      recipient.captureGpsLocation === true ||
      document.captureGpsLocation === true;

    if (requiresGps && action === 'signed') {
      if (!location || !consent?.locationGranted) {
        return NextResponse.json(
          { message: 'GPS location consent is required to sign this document' },
          { status: 400 }
        );
      }
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() ?? 'unknown';

    if (recipient.role === 'signer') {
      if (!['signed', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid signer action' }, { status: 400 });
      }
      recipient.status = action;
      if (action === 'signed') {
        recipient.signedAt = new Date();
        recipient.location = location;
        recipient.device = device;
        recipient.consent = consent;
        recipient.network = { ip };
      } else {
        recipient.rejectedAt = new Date();
      }
    }
    if (recipient.role === 'approver') {
      if (!['approved', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid approver action' }, { status: 400 });
      }
      recipient.status = action;
      if (action === 'approved') {
        recipient.approvedAt = new Date();
        recipient.location = location;
        recipient.device = device;
        recipient.consent = consent;
        recipient.network = { ip };
      } else {
        recipient.rejectedAt = new Date();
      }
    }
    document.markModified('recipients');
    document.status = getUpdatedDocumentStatus(document.toObject());
    if (document.status === 'completed') {
      version.status = 'signed';
      document.markModified('versions');
    }

    await document.save();

    // Trigger next recipient if sequential signing is enabled and action was success
    if (document.sequentialSigning && (action === 'signed' || action === 'approved')) {
      const currentOrder = recipient.order;

      // Check if all recipients at current order are done
      const allCurrentOrderDone = document.recipients
        .filter((r: IDocumentRecipient) => r.order === currentOrder && r.role !== 'viewer')
        .every((r: IDocumentRecipient) => r.status === 'signed' || r.status === 'approved');

      if (allCurrentOrderDone) {
        // Find next order
        const orders = document.recipients
          .filter((r: IDocumentRecipient) => r.role !== 'viewer' && r.order > currentOrder)
          .map((r: IDocumentRecipient) => r.order);

        if (orders.length > 0) {
          const nextOrder = Math.min(...orders);
          const nextRecipients = document.recipients.filter((r: IDocumentRecipient) => r.order === nextOrder);

          for (const nextRec of nextRecipients) {
            if (nextRec.status === 'pending') {
              nextRec.status = 'sent';
              await sendSigningRequestEmail(nextRec, document, {}, version.signingToken);
            }
          }
          document.markModified('recipients');
          await document.save();
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Failed to update document status' },
      { status: 500 }
    );
  }
}
