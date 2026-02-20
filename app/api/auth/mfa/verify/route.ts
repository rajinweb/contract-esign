import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { MfaVerifyBodySchema } from '@/lib/auth-schemas';
import connectDB from '@/utils/db';
import { isMfaConfigurationError, verifyTotpCode } from '@/lib/mfa';
import UserModel from '@/models/Users';
import { authenticateRequest } from '@/middleware/authMiddleware';

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authentication endpoints.' }, { status: 400 })
    );
  }

  if (!validateCsrfToken(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'CSRF validation failed', reason: 'csrf_mismatch' }, { status: 403 })
    );
  }

  const auth = await authenticateRequest(req, { requireRecentAuth: true });
  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    );
  }

  const parsed = MfaVerifyBodySchema.safeParse(body);
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

  const code = parsed.data.code;

  try {
    await connectDB();

    const user = await UserModel.findById(auth.context.user._id)
      .select('+mfaSecret mfaEnabled')
      .lean<{ _id: unknown; mfaSecret?: string | null; mfaEnabled?: boolean } | null>();

    if (!user || !user.mfaSecret) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'MFA setup not initialized for this account.' }, { status: 400 })
      );
    }

    if (!verifyTotpCode(user.mfaSecret, code)) {
      await writeAuditEvent({
        userId: String(auth.context.user._id),
        action: 'auth.mfa.verify.failed',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_mfa_code' },
      });

      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'Invalid MFA code' }, { status: 401 })
      );
    }

    await UserModel.updateOne(
      { _id: auth.context.user._id },
      {
        $set: {
          mfaEnabled: true,
        },
      }
    ).exec();

    await writeAuditEvent({
      userId: String(auth.context.user._id),
      action: 'auth.mfa.verify.success',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
      },
    });

    return withSecurityHeaders(req, NextResponse.json({ success: true }, { status: 200 }));
  } catch (error) {
    if (isMfaConfigurationError(error)) {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'MFA service is misconfigured. Please contact support.' },
          { status: 500 }
        )
      );
    }

    console.error('MFA verify route error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
