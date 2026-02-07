import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { sendSigningRequestEmail } from '@/lib/email';
import { updateDocumentStatus } from '@/lib/statusLogic';
import { Recipient } from '@/types/types';
import { buildEventClient, buildEventConsent, buildEventGeo, getLatestPreparedVersion, getNextSequentialOrder, normalizeIp } from '@/lib/signing-utils';
import { copyObject, getRegion } from '@/lib/s3';

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
    if (document.status === 'completed') {
      return NextResponse.json({ message: 'Completed documents are immutable. Create a new document to modify.' }, { status: 409 });
    }

    /* ======================================================
      1️⃣ LOCK PREPARED VERSION (CANONICAL PDF)
    ====================================================== */
    let preparedVersion = getLatestPreparedVersion(document.versions || []);
    if (!preparedVersion) {
      const versions = Array.isArray(document.versions) ? document.versions : [];
      const fallbackVersion =
        versions.find((v: any) => v?.version === document.currentVersion) ||
        versions.find((v: any) => v?.label === 'original') ||
        versions[versions.length - 1];

      if (!fallbackVersion || !fallbackVersion?.storage?.key) {
        return NextResponse.json(
          { message: 'Prepared version not found' },
          { status: 400 }
        );
      }
      if (fallbackVersion.storage.provider !== 's3') {
        return NextResponse.json(
          { message: 'Source document storage provider is unsupported.' },
          { status: 400 }
        );
      }

      const bucket = fallbackVersion.storage.bucket || process.env.S3_BUCKET_NAME;
      if (!bucket) {
        return NextResponse.json({ message: 'S3 bucket not configured.' }, { status: 500 });
      }

      const preparedVersionNumber = (document.currentVersion ?? 0) + 1;
      const preparedKey = `documents/${userId}/${document._id}/prepared_${preparedVersionNumber}.pdf`;
      await copyObject({
        sourceBucket: bucket,
        sourceKey: fallbackVersion.storage.key,
        destinationBucket: bucket,
        destinationKey: preparedKey,
        region: fallbackVersion.storage.region || getRegion(),
      });

      preparedVersion = {
        version: preparedVersionNumber,
        label: 'prepared',
        derivedFromVersion: fallbackVersion.version,
        storage: {
          provider: 's3',
          bucket,
          key: preparedKey,
          region: fallbackVersion.storage.region || getRegion(),
          url: `s3://${bucket}/${preparedKey}`,
        },
        hash: fallbackVersion.hash,
        hashAlgo: fallbackVersion.hashAlgo || 'SHA-256',
        size: fallbackVersion.size,
        mimeType: fallbackVersion.mimeType,
        locked: false,
        fields: Array.isArray(fallbackVersion.fields) ? fallbackVersion.fields : [],
        documentName: document.documentName,
        status: 'draft',
        changeLog: 'Document prepared for signing',
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      document.versions.push(preparedVersion);
      document.currentVersion = preparedVersionNumber;
    }

    if (!preparedVersion) {
      return NextResponse.json(
        { message: 'Prepared version not found' },
        { status: 400 }
      );
    }

    const sentAt = new Date();
    // ✅ versions only care about immutability
    preparedVersion.locked = true;
    preparedVersion.sentAt = sentAt;

    /* ======================================================
       2️⃣ SET SIGNING MODE + STATE
    ====================================================== */
    const signingMode = reqSigningMode || document.signingMode || 'parallel';
    document.signingMode = signingMode;

    let nextOrder: number | null = null;
    if (signingMode === 'sequential') {
      const missingOrder = recipients.some(
        (r: Recipient) => r.role !== 'viewer' && typeof r.order !== 'number'
      );
      if (missingOrder) {
        return NextResponse.json({ message: 'Order is required for sequential signing' }, { status: 400 });
      }
      nextOrder = getNextSequentialOrder(recipients);
    }
    document.signingEvents ??= [];
    document.auditTrailVersion ??= 1;
    const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));
    const userAgent = req.headers.get('user-agent') ?? undefined;

    /* ======================================================
       3️⃣ ASSIGN RECIPIENTS + TOKENS
    ====================================================== */
    document.recipients = recipients.map((r: Recipient) => {
      const token = crypto.randomBytes(32).toString('hex');
      let status: 'sent' | 'pending' | 'signed' = 'sent';
      if (signingMode === 'sequential' && r.role !== 'viewer' && r.order !== nextOrder) {
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

    const baseVersion = preparedVersion.version;
    const targetVersion = signingMode === 'sequential' ? document.currentVersion + 1 : undefined;

    for (const recipient of document.recipients) {
      if (recipient.status === 'sent') {
        document.signingEvents.push({
          recipientId: recipient.id,
          action: 'sent',
          sentAt: sentAt,
          serverTimestamp: sentAt,
          baseVersion,
          targetVersion,
          order: recipient.order,
          ip,
          ipUnavailableReason,
          userAgent,
          client: buildEventClient({ ip, userAgent, recipient }),
          geo: buildEventGeo(recipient),
          consent: buildEventConsent(recipient),
        });
      }
    }

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
