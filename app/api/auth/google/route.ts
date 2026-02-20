import { OAuth2Client } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { applyAuthSessionCookies, issueSessionForUser } from '@/lib/auth-session';
import connectDB from '@/utils/db';
import {
  isJwtConfigurationError,
} from '@/lib/jwt';
import { isMfaConfigurationError, verifyTotpCode } from '@/lib/mfa';
import { consumeRateLimit } from '@/lib/rateLimit';
import { isUserAllowed } from '@/lib/user-status';
import UserModel from '@/models/Users';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

function isGoogleTokenValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("can't parse token envelope") ||
    message.includes('wrong number of segments') ||
    message.includes('jwt malformed') ||
    message.includes('invalid token') ||
    message.includes('invalid signature') ||
    message.includes('token used too late') ||
    message.includes('no pem found')
  );
}

function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
  const normalized = (fullName || '').trim();
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

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

  const rateLimit = await consumeRateLimit({
    key: ipAddress,
    namespace: 'auth:google:ip',
    limit: 30,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return withSecurityHeaders(req, response);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withSecurityHeaders(req, NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 }));
  }

  const parsedBody = body as { token?: unknown; totpCode?: unknown };
  const idToken = parsedBody.token;
  if (typeof idToken !== 'string' || !idToken.trim()) {
    return withSecurityHeaders(req, NextResponse.json({ message: 'Token is required' }, { status: 400 }));
  }

  const rawTotpCode = parsedBody.totpCode;
  if (rawTotpCode !== undefined && rawTotpCode !== null && typeof rawTotpCode !== 'string') {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Invalid MFA code format' }, { status: 400 })
    );
  }
  const totpCode = typeof rawTotpCode === 'string' ? rawTotpCode.trim() : '';
  if (totpCode && !/^\d{6}$/.test(totpCode)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Invalid MFA code format' }, { status: 400 })
    );
  }

  const audience = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!audience) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Google auth is not configured' }, { status: 500 })
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || payload.email_verified !== true) {
      return withSecurityHeaders(req, NextResponse.json({ message: 'Invalid Google token' }, { status: 401 }));
    }

    await connectDB();

    const normalizedEmail = payload.email.toLowerCase();
    let user = await UserModel.findOne({ email: normalizedEmail }).select('+mfaSecret').exec();

    if (user && !isUserAllowed(user)) {
      await writeAuditEvent({
        userId: String(user._id),
        action: 'auth.login.blocked',
        ipAddress,
        userAgent,
        metadata: { reason: 'account_disabled_or_deleted', provider: 'google' },
      });

      return withSecurityHeaders(req, NextResponse.json({ message: 'Account is disabled' }, { status: 403 }));
    }

    const { firstName, lastName } = splitName(payload.name);
    const profilePicture = typeof payload.picture === 'string' ? payload.picture : '';

    if (!user) {
      user = await UserModel.create({
        email: normalizedEmail,
        firstName,
        lastName,
        name: payload.name || `${firstName} ${lastName}`.trim(),
        picture: profilePicture,
        role: 'user',
        isActive: true,
        isDeleted: false,
        tokenVersion: 0,
        failedLoginAttempts: 0,
        lockUntil: null,
      });
    } else {
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            picture: profilePicture,
            firstName: user.firstName || firstName,
            lastName: user.lastName || lastName,
          },
        }
      ).exec();
    }

    if (user.mfaEnabled) {
      if (!totpCode) {
        await writeAuditEvent({
          userId: String(user._id),
          action: 'auth.login.failed',
          ipAddress,
          userAgent,
          metadata: { reason: 'mfa_required', provider: 'google' },
        });
        return withSecurityHeaders(
          req,
          NextResponse.json(
            { message: 'MFA code is required for Google sign-in.', mfaRequired: true },
            { status: 403 }
          )
        );
      }

      if (!user.mfaSecret || !verifyTotpCode(user.mfaSecret, totpCode)) {
        await writeAuditEvent({
          userId: String(user._id),
          action: 'auth.login.failed',
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_mfa_code', provider: 'google' },
        });

        return withSecurityHeaders(req, NextResponse.json({ message: 'Invalid MFA code' }, { status: 401 }));
      }
    }

    const issued = await issueSessionForUser({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
        firstName: user.firstName || firstName,
        lastName: user.lastName || lastName,
        picture: profilePicture || user.picture,
      },
      deviceInfo: 'google-oauth',
      ipAddress,
      userAgent,
    });

    await writeAuditEvent({
      userId: String(user._id),
      action: 'auth.login.success',
      ipAddress,
      userAgent,
      metadata: {
        provider: 'google',
        sessionId: issued.sessionId,
        mfaUsed: Boolean(user.mfaEnabled),
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        accessToken: issued.accessToken,
        token: issued.accessToken,
        accessTokenTtl: issued.accessTokenTtl,
        user: issued.safeUser,
      },
      { status: 200 }
    );

    applyAuthSessionCookies(response, issued.refreshToken, issued.refreshExpiresAt);

    return withSecurityHeaders(req, response);
  } catch (err) {
    if (isJwtConfigurationError(err)) {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'Authentication service is misconfigured. Missing or invalid JWT key material.' },
          { status: 500 }
        )
      );
    }

    if (isMfaConfigurationError(err)) {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'MFA service is misconfigured. Please contact support.' },
          { status: 500 }
        )
      );
    }

    if (isGoogleTokenValidationError(err)) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'Invalid Google token' }, { status: 401 })
      );
    }

    console.error('Google auth error', err);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Authentication failed' }, { status: 500 })
    );
  }
}
