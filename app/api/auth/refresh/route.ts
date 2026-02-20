import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import {
  CSRF_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  getClientIp,
  getUserAgent,
  hashRefreshToken,
  isSecureRequest,
  unauthorizedResponse,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import {
  applyAuthSessionCookies,
  clearAllAuthCookies,
  revokeAllUserSessionsAndBumpTokenVersion,
  toSafeAuthUser,
} from '@/lib/auth-session';
import connectDB from '@/utils/db';
import {
  getRefreshTokenExpiryDate,
  isJwtConfigurationError,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/jwt';
import { consumeRateLimit } from '@/lib/rateLimit';
import { isUserAllowed } from '@/lib/user-status';
import SessionModel from '@/models/Session';
import UserModel from '@/models/Users';

export const runtime = 'nodejs';

function unauthorizedWithClearedCookies(message = 'Unauthorized'): NextResponse {
  const response = unauthorizedResponse({ message });
  clearAllAuthCookies(response);
  return response;
}

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
    namespace: 'auth:refresh:ip',
    limit: 120,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many refresh attempts. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return withSecurityHeaders(req, response);
  }

  if (!validateCsrfToken(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          message: 'CSRF validation failed',
          reason: 'csrf_mismatch',
          cookie: CSRF_COOKIE_NAME,
        },
        { status: 403 }
      )
    );
  }

  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return withSecurityHeaders(req, unauthorizedWithClearedCookies('Missing refresh token'));
  }

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (isJwtConfigurationError(error)) {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'Authentication service is misconfigured. Missing or invalid JWT key material.' },
          { status: 500 }
        )
      );
    }

    return withSecurityHeaders(req, unauthorizedWithClearedCookies('Invalid refresh token'));
  }

  try {
    await connectDB();

    const tokenHash = hashRefreshToken(refreshToken);

    const session = await SessionModel.findById(payload.sessionId)
      .select('_id userId revoked expiresAt')
      .lean<{
        _id: string;
        userId: mongoose.Types.ObjectId;
        revoked: boolean;
        expiresAt: Date;
      } | null>();

    if (!session) {
      await writeAuditEvent({
        userId: payload.userId,
        action: 'auth.refresh.failed',
        ipAddress,
        userAgent,
        metadata: { reason: 'session_not_found', sessionId: payload.sessionId },
      });
      return withSecurityHeaders(req, unauthorizedWithClearedCookies('Session not found'));
    }

    if (session.revoked || new Date(session.expiresAt).getTime() <= Date.now()) {
      await writeAuditEvent({
        userId: String(session.userId),
        action: 'auth.refresh.failed',
        ipAddress,
        userAgent,
        metadata: { reason: session.revoked ? 'session_revoked' : 'session_expired' },
      });
      return withSecurityHeaders(req, unauthorizedWithClearedCookies('Refresh session expired or revoked'));
    }

    const user = await UserModel.findById(session.userId)
      .select('email role tokenVersion isActive isDeleted firstName lastName picture')
      .lean<{
        _id: mongoose.Types.ObjectId;
        email: string;
        role: string;
        tokenVersion: number;
        isActive?: boolean;
        isDeleted?: boolean;
        firstName?: string;
        lastName?: string;
        picture?: string;
      } | null>();

    if (!user || !isUserAllowed(user)) {
      await writeAuditEvent({
        userId: user?._id?.toString() || payload.userId,
        action: 'auth.refresh.failed',
        ipAddress,
        userAgent,
        metadata: { reason: 'user_inactive_or_deleted' },
      });
      return withSecurityHeaders(req, unauthorizedWithClearedCookies('User is inactive or deleted'));
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      await writeAuditEvent({
        userId: String(user._id),
        action: 'auth.refresh.failed',
        ipAddress,
        userAgent,
        metadata: {
          reason: 'token_version_mismatch',
          expected: user.tokenVersion,
          received: payload.tokenVersion,
        },
      });
      return withSecurityHeaders(req, unauthorizedWithClearedCookies('Token version mismatch'));
    }

    const newAccessToken = signAccessToken({
      userId: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion,
      sessionId: session._id,
      authTime: payload.authTime,
    });

    const newRefreshToken = signRefreshToken({
      userId: String(user._id),
      tokenVersion: user.tokenVersion,
      sessionId: session._id,
      authTime: payload.authTime,
    });

    const newRefreshExpiry = getRefreshTokenExpiryDate();
    const newRefreshHash = hashRefreshToken(newRefreshToken);

    const rotationResult = await SessionModel.updateOne(
      {
        _id: session._id,
        userId: session.userId,
        refreshTokenHash: tokenHash,
        revoked: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          refreshTokenHash: newRefreshHash,
          expiresAt: newRefreshExpiry,
          ipAddress,
          userAgent,
          revoked: false,
        },
      }
    ).exec();

    if (rotationResult.modifiedCount !== 1) {
      await revokeAllUserSessionsAndBumpTokenVersion(String(session.userId));
      await writeAuditEvent({
        userId: String(session.userId),
        action: 'auth.refresh.reuse_detected',
        ipAddress,
        userAgent,
        metadata: { sessionId: payload.sessionId, reason: 'rotation_compare_and_swap_failed' },
      });

      return withSecurityHeaders(
        req,
        unauthorizedWithClearedCookies('Refresh token reuse detected. All sessions have been revoked.')
      );
    }

    await writeAuditEvent({
      userId: String(user._id),
      action: 'auth.refresh.success',
      ipAddress,
      userAgent,
      metadata: { sessionId: session._id },
    });

    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      token: newAccessToken,
      user: toSafeAuthUser(user),
    });

    applyAuthSessionCookies(response, newRefreshToken, newRefreshExpiry);

    return withSecurityHeaders(req, response);
  } catch (error) {
    if (isJwtConfigurationError(error)) {
      return withSecurityHeaders(
        req,
        NextResponse.json(
          { message: 'Authentication service is misconfigured. Missing or invalid JWT key material.' },
          { status: 500 }
        )
      );
    }

    console.error('Refresh route error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
