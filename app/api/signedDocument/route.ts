import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import { sendSigningRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const {
      token,
      action,
      location,
      device,
      consent
    } = await req.json();

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    /* =====================================================
       FIND DOCUMENT + RECIPIENT (TOKEN IS AUTH)
    ===================================================== */
    const document = await DocumentModel.findOne({
      'recipients.signingToken': token
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Invalid or expired signing link' },
        { status: 404 }
      );
    }

    const recipient = document.recipients.find((r: { signingToken: any; }) => r.signingToken === token);

    if (!recipient) {
      return NextResponse.json(
        { message: 'Recipient not found' },
        { status: 404 }
      );
    }

    /* =====================================================
       EXPIRY CHECK
    ===================================================== */
    if (recipient.expiresAt && new Date() > recipient.expiresAt) {
      recipient.status = 'expired';
      await document.save();

      return NextResponse.json(
        { message: 'Signing link expired' },
        { status: 410 }
      );
    }

    /* =====================================================
       PREVENT REUSE
    ===================================================== */
    if (['signed', 'approved'].includes(recipient.status)) {
      return NextResponse.json({ success: true });
    }

    if (['rejected', 'expired'].includes(recipient.status)) {
      return NextResponse.json(
        { message: 'Signing link no longer valid' },
        { status: 401 }
      );
    }

    /* =====================================================
       SEQUENTIAL SIGNING ENFORCEMENT
    ===================================================== */
    if (document.signingMode === 'sequential') {
      if (
        !document.signingState ||
        recipient.order !== document.signingState.currentOrder
      ) {
        return NextResponse.json(
          { message: 'Signing not allowed yet' },
          { status: 403 }
        );
      }
    }

    /* =====================================================
       GPS CONSENT CHECK
    ===================================================== */
    const requiresGps =
      recipient.captureGpsLocation === true;

    if (requiresGps && action !== 'rejected') {
      if (!location || !consent?.locationGranted) {
        return NextResponse.json(
          { message: 'GPS location consent is required' },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       APPLY ACTION
    ===================================================== */
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    if (recipient.role === 'signer') {
      if (!['signed', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid signer action' }, { status: 400 });
      }

      recipient.status = action;
      recipient.signedAt = action === 'signed' ? new Date() : undefined;
      // ⚠️ signedVersion is set by /api/sign-document when version is created
    }

    if (recipient.role === 'approver') {
      if (!['approved', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid approver action' }, { status: 400 });
      }

      recipient.status = action;
      recipient.approvedAt = action === 'approved' ? new Date() : undefined;
      // ⚠️ signedVersion is set by /api/sign-document when version is created
    }

    recipient.location = location;
    recipient.device = device;
    recipient.consent = consent;
    recipient.network = { ip };

    /* =====================================================
       UPDATE SIGNING STATE
    ===================================================== */
    // NOTE: Signing events are created by /api/sign-document endpoint
    // This endpoint only records the signing action (accepted/rejected) metadata
    document.signingState ??= {
      signedRecipients: [],
      signingEvents: []
    };

    /* =====================================================
       DOCUMENT STATUS UPDATE
    ===================================================== */
    document.status = getUpdatedDocumentStatus(document.toObject());

    /* =====================================================
       SEQUENTIAL: MOVE TO NEXT ORDER
    ===================================================== */
    if (
      document.signingMode === 'sequential' &&
      ['signed', 'approved'].includes(action)
    ) {
      const currentOrder = recipient.order;

      const allDone = document.recipients
        .filter((r: { order: any; role: string; }) => r.order === currentOrder && r.role !== 'viewer')
        .every((r: { status: string; }) => ['signed', 'approved'].includes(r.status));

      if (allDone) {
        const nextOrder = Math.min(
          ...document.recipients
            .filter((r: { role: string; order: number; }) => r.role !== 'viewer' && r.order > currentOrder)
            .map((r: { order: any; }) => r.order)
        );

        if (Number.isFinite(nextOrder)) {
          document.signingState.currentOrder = nextOrder;

          const nextRecipients = document.recipients.filter(
            (r: { order: number; status: string; }) => r.order === nextOrder && r.status === 'pending'
          );

          for (const nextRec of nextRecipients) {
            try {
              await sendSigningRequestEmail(nextRec, document, undefined, nextRec.signingToken);
              nextRec.status = 'sent';
            } catch (err) {
              console.error('Email failed:', err);
            }
          }
        } else {
          document.signingState.currentOrder = undefined;
        }
      }
    }

    await document.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SIGN ERROR:', error);
    return NextResponse.json(
      { message: 'Failed to update document status' },
      { status: 500 }
    );
  }
}
