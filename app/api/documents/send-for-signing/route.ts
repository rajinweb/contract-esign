import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { sendSigningRequestEmail } from '@/lib/email';
import { consumeRateLimit } from '@/lib/rateLimit';
import {
  buildEventClient,
  buildEventConsent,
  buildEventGeo,
  getLatestPreparedVersion,
  getNextSequentialOrder,
  normalizeIp,
} from '@/lib/signing-utils';
import { copyObject, getRegion } from '@/lib/s3';
import { updateDocumentStatus } from '@/lib/statusLogic';
import connectDB from '@/utils/db';
import { authenticateRequest, enforceMfaForSensitiveAction } from '@/middleware/authMiddleware';
import DocumentModel, { IDocumentRecipient } from '@/models/Document';

const DocumentIdRegex = /^[a-f\d]{24}$/i;

const RecipientSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(320),
    name: z.string().trim().min(1).max(200),
    role: z.enum(['signer', 'approver', 'viewer']),
    color: z.string().trim().max(40).optional(),
    order: z.number().int().positive().max(1000).optional(),
  })
  .passthrough();

const SendForSigningBodySchema = z.object({
  documentId: z.string().trim().regex(DocumentIdRegex),
  recipients: z.array(RecipientSchema).min(1).max(200),
  subject: z.string().trim().max(300).optional(),
  message: z.string().trim().max(2000).optional(),
  signingMode: z.enum(['parallel', 'sequential']).optional(),
});

type RequestRecipient = {
  id: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer';
  color?: string;
  order?: number;
};

type EmailFailure = {
  id: string;
  email: string;
  reason: string;
};

type FallbackVersion = {
  [key: string]: unknown;
  version?: number;
  label?: string;
  storage?: {
    provider?: string;
    bucket?: string;
    key?: string;
    region?: string;
    url?: string;
  };
  hash?: string;
  hashAlgo?: string;
  size?: number;
  mimeType?: string;
  fields?: unknown[];
};

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

// POST - Send a document for signing
export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json(
        { message: 'HTTPS is required for authentication endpoints.' },
        { status: 400 }
      )
    );
  }

  const rateLimit = await consumeRateLimit({
    key: ipAddress,
    namespace: 'documents:send-for-signing:ip',
    limit: 120,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return withSecurityHeaders(req, response);
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
  }

  const mfaCheck = enforceMfaForSensitiveAction(auth.context, req.headers.get('x-mfa-code'));
  if (!mfaCheck.ok) {
    return withSecurityHeaders(req, mfaCheck.response);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    );
  }

  const parsed = SendForSigningBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          message: 'Validation failed',
          errors: parsed.error.issues.map((issue: { message: string }) => issue.message),
        },
        { status: 400 }
      )
    );
  }

  const {
    documentId,
    recipients: parsedRecipients,
    subject,
    message,
    signingMode: reqSigningMode,
  } = parsed.data;
  const recipients = parsedRecipients as RequestRecipient[];
  const userId = String(auth.context.user._id);

  try {
    await connectDB();

    const document = await DocumentModel.findOne({ _id: documentId, userId });

    if (!document) {
      return withSecurityHeaders(req, NextResponse.json({ message: 'Document not found' }, { status: 404 }));
    }
    if (document.status === 'completed') {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'Completed documents are immutable. Create a new document to modify.' },
          { status: 409 }
        )
      );
    }

    let preparedVersion = getLatestPreparedVersion(document.versions || []) as FallbackVersion | null;
    if (!preparedVersion) {
      const versions = Array.isArray(document.versions) ? (document.versions as FallbackVersion[]) : [];
      const fallbackVersion =
        versions.find((v) => v?.version === document.currentVersion) ||
        versions.find((v) => v?.label === 'original') ||
        versions[versions.length - 1];

      if (!fallbackVersion || !fallbackVersion.storage?.key) {
        return withSecurityHeaders(
          req,
          NextResponse.json({ message: 'Prepared version not found' }, { status: 400 })
        );
      }
      if (fallbackVersion.storage.provider !== 's3') {
        return withSecurityHeaders(
          req,
          NextResponse.json({ message: 'Source document storage provider is unsupported.' }, { status: 400 })
        );
      }

      const bucket = fallbackVersion.storage.bucket || process.env.S3_BUCKET_NAME;
      if (!bucket) {
        return withSecurityHeaders(req, NextResponse.json({ message: 'S3 bucket not configured.' }, { status: 500 }));
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
      };

      document.versions.push(preparedVersion);
      document.currentVersion = preparedVersionNumber;
    }

    if (!preparedVersion) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'Prepared version not found' }, { status: 400 })
      );
    }

    const sentAt = new Date();
    preparedVersion.locked = true;
    preparedVersion.sentAt = sentAt;

    const signingMode = reqSigningMode || document.signingMode || 'parallel';
    document.signingMode = signingMode;

    let nextOrder: number | null = null;
    if (signingMode === 'sequential') {
      const missingOrder = recipients.some((r) => r.role !== 'viewer' && typeof r.order !== 'number');
      if (missingOrder) {
        return withSecurityHeaders(
          req,
          NextResponse.json({ message: 'Order is required for sequential signing' }, { status: 400 })
        );
      }
      nextOrder = getNextSequentialOrder(recipients);
    }
    document.signingEvents ??= [];
    document.auditTrailVersion ??= 1;
    const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));

    document.recipients = recipients.map((r) => {
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
        signedVersion: null,
      };
    });

    const baseVersion = preparedVersion.version;
    const targetVersion = signingMode === 'sequential' ? document.currentVersion + 1 : undefined;

    for (const recipient of document.recipients) {
      if (recipient.status === 'sent') {
        document.signingEvents.push({
          recipientId: recipient.id,
          action: 'sent',
          sentAt,
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

    const recipientsToNotify = document.recipients.filter(
      (recipient: IDocumentRecipient) => recipient.status === 'sent' || recipient.role === 'viewer'
    );
    const emailFailures: EmailFailure[] = [];

    for (const recipient of recipientsToNotify) {
      try {
        await sendSigningRequestEmail(recipient, document, { subject, message }, recipient.signingToken);
      } catch (emailError) {
        const reason = emailError instanceof Error ? emailError.message : 'unknown_email_error';
        emailFailures.push({
          id: recipient.id,
          email: recipient.email,
          reason,
        });
      }
    }

    if (emailFailures.length > 0) {
      const uniqueFailureReasons = [...new Set(emailFailures.map((failure) => failure.reason).filter(Boolean))];
      await writeAuditEvent({
        userId,
        action: 'document.send_for_signing.email_delivery_issue',
        ipAddress,
        userAgent,
        metadata: {
          documentId: String(document._id),
          attempted: recipientsToNotify.length,
          failed: emailFailures.length,
          reasons: uniqueFailureReasons,
          failures: emailFailures,
          sessionId: auth.context.sessionId,
        },
      });
    }

    await writeAuditEvent({
      userId,
      action: 'document.send_for_signing.success',
      ipAddress,
      userAgent,
      metadata: {
        documentId: String(document._id),
        recipientCount: recipients.length,
        signingMode: document.signingMode,
        emailDelivery: {
          attempted: recipientsToNotify.length,
          delivered: recipientsToNotify.length - emailFailures.length,
          failed: emailFailures.length,
        },
        sessionId: auth.context.sessionId,
      },
    });

    const notificationMessage =
      emailFailures.length === 0
        ? 'Document sent for signing'
        : emailFailures.length === recipientsToNotify.length
          ? `Document sent, but no notification emails could be delivered.${emailFailures[0]?.reason ? ` ${emailFailures[0].reason}` : ''}`
          : `Document sent, but ${emailFailures.length} notification email(s) failed.`;

    return withSecurityHeaders(
      req,
      NextResponse.json({
        message: notificationMessage,
        signingMode: document.signingMode,
        emailDelivery: {
          attempted: recipientsToNotify.length,
          delivered: recipientsToNotify.length - emailFailures.length,
          failed: emailFailures.length,
          failedRecipients: emailFailures.map(({ id, email, reason }) => ({ id, email, reason })),
        },
      })
    );
  } catch (error) {
    await writeAuditEvent({
      userId,
      action: 'document.send_for_signing.failed',
      ipAddress,
      userAgent,
      metadata: {
        documentId,
        reason: error instanceof Error ? error.message : 'unknown_error',
      },
    });

    console.error('API Error in POST /api/documents/send-for-signing', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    );
  }
}
