import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IVersionDoc } from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import { sendSigningRejectedEmail, sendSigningRequestEmail } from '@/lib/email';
import { buildEventClient, buildEventConsent, buildEventGeo, getNextSequentialOrder, isRecipientTurn, normalizeIp } from '@/lib/signing-utils';
import Users from '@/models/Users';

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
    if (document.deletedAt) {
      return NextResponse.json({ message: 'Document has been trashed.' }, { status: 410 });
    }
    if (document.status === 'completed' || document.status === 'voided' || document.status === 'rejected') {
      const message =
        document.status === 'rejected'
          ? 'This signing request was rejected.'
          : 'Document is not available for signing.';
      return NextResponse.json({ message }, { status: 409 });
    }

    const recipient = document.recipients.find((r: { signingToken: string; }) => r.signingToken === token);

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
      if (!isRecipientTurn(recipient, document.recipients)) {
        return NextResponse.json(
          { message: 'Signing not allowed yet' },
          { status: 403 }
        );
      }
    }

    const signedVersionFromRecipient =
      recipient.signedVersion != null
        ? document.versions.find((v: IVersionDoc) => v.version === recipient.signedVersion)
        : undefined;
    const signedVersionFromChain = document.versions
      .filter((v: IVersionDoc) => {
        if (Array.isArray(v.signedBy)) {
          return v.signedBy.includes(recipient.id);
        }
        return v.signedBy === recipient.id;
      })
      .sort((a: IVersionDoc, b: IVersionDoc) => (b.version ?? 0) - (a.version ?? 0))[0];
    const signedVersion = signedVersionFromRecipient ?? signedVersionFromChain;
    if (action === 'signed' && !signedVersion) {
      return NextResponse.json(
        { message: 'Signed PDF missing. Please sign via the signing endpoint.' },
        { status: 409 }
      );
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
    const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));
    const userAgent = req.headers.get('user-agent') ?? undefined;
    const actionAt = new Date();

    if (recipient.role === 'signer') {
      if (!['signed', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid signer action' }, { status: 400 });
      }

      recipient.status = action;
      recipient.signedAt = action === 'signed' ? actionAt : undefined;
      recipient.rejectedAt = action === 'rejected' ? actionAt : undefined;
      if (action === 'signed' && signedVersion?.version != null) {
        recipient.signedVersion = signedVersion.version;
      }
    }

    if (recipient.role === 'approver') {
      if (!['approved', 'rejected'].includes(action)) {
        return NextResponse.json({ message: 'Invalid approver action' }, { status: 400 });
      }

      recipient.status = action;
      recipient.approvedAt = action === 'approved' ? actionAt : undefined;
      recipient.rejectedAt = action === 'rejected' ? actionAt : undefined;
    }

    recipient.location = location;
    recipient.device = device;
    recipient.consent = consent;
    recipient.network = { ip, ipUnavailableReason };

    /* =====================================================
       APPEND SIGNING EVENT
    ===================================================== */
    document.signingEvents ??= [];
    document.signingEvents.push({
      recipientId: recipient.id,
      action: action,
      signedAt: actionAt,
      serverTimestamp: actionAt,
      baseVersion: signedVersion?.derivedFromVersion,
      version: signedVersion?.version,
      order: recipient.order,
      ip,
      ipUnavailableReason,
      userAgent,
      client: buildEventClient({ ip, userAgent, recipient }),
      geo: buildEventGeo(recipient),
      consent: buildEventConsent(recipient),
    });

    /* =====================================================
       DOCUMENT STATUS UPDATE
    ===================================================== */
    document.status = getUpdatedDocumentStatus(document.toObject());
    if (document.status === 'completed') {
      document.completedAt ??= actionAt;
      document.finalizedAt ??= actionAt;
    }
    if (action === 'rejected') {
      try {
        const owner = await Users.findById(document.userId).lean<{ email?: unknown }>();
        const ownerEmail = typeof owner?.email === 'string' ? owner.email : undefined;
        if (ownerEmail) {
          await sendSigningRejectedEmail(ownerEmail, document.documentName, recipient);
        }
      } catch (err) {
        console.error('Failed to send rejection email:', err);
      }
    }

    /* =====================================================
       SEQUENTIAL: MOVE TO NEXT ORDER
    ===================================================== */
    if (
      document.signingMode === 'sequential' &&
      ['signed', 'approved'].includes(action)
    ) {
      const nextOrder = getNextSequentialOrder(document.recipients);
      if (nextOrder !== null) {
        const nextRecipients = document.recipients.filter(
          (r: { order: number; status: string; role: string; }) =>
            r.role !== 'viewer' && r.order === nextOrder && r.status === 'pending'
        );

        for (const nextRec of nextRecipients) {
          try {
            await sendSigningRequestEmail(nextRec, document, undefined, nextRec.signingToken);
            nextRec.status = 'sent';
          } catch (err) {
            console.error('Email failed:', err);
          }
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
