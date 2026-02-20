import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import connectDB from '@/utils/db';
import {
  buildTotpOtpAuthUrl,
  encryptMfaSecret,
  generateMfaSecret,
  isMfaConfigurationError,
} from '@/lib/mfa';
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

  try {
    await connectDB();

    const secret = generateMfaSecret();
    const encryptedSecret = encryptMfaSecret(secret);
    const otpauthUrl = buildTotpOtpAuthUrl(auth.context.user.email, secret, 'Contract eSign');

    await UserModel.updateOne(
      { _id: auth.context.user._id },
      {
        $set: {
          mfaSecret: encryptedSecret,
          mfaEnabled: false,
        },
      }
    ).exec();

    await writeAuditEvent({
      userId: String(auth.context.user._id),
      action: 'auth.mfa.setup.initiated',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
      },
    });

    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          manualEntryKey: secret,
          otpauthUrl,
        },
        { status: 200 }
      )
    );
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

    console.error('MFA setup route error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
