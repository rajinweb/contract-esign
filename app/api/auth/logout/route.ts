import { NextRequest, NextResponse } from 'next/server';

import {
  REFRESH_TOKEN_COOKIE_NAME,
  getClientIp,
  getUserAgent,
  hashRefreshToken,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { clearAllAuthCookies, revokeSessionById } from '@/lib/auth-session';
import connectDB from '@/utils/db';
import SessionModel from '@/models/Session';
import { verifyRefreshToken } from '@/lib/jwt';

export const runtime = 'nodejs';

function sanitizeRedirectTarget(target: string | null): string {
  if (!target) {
    return '/login';
  }

  const normalized = target.trim();
  if (!normalized.startsWith('/')) {
    return '/login';
  }

  // Block protocol-relative and backslash-prefixed redirect vectors.
  if (normalized.startsWith('//') || normalized.startsWith('/\\')) {
    return '/login';
  }

  if (/[\r\n]/.test(normalized)) {
    return '/login';
  }

  return normalized;
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

  if (!validateCsrfToken(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'CSRF validation failed', reason: 'csrf_mismatch' }, { status: 403 })
    );
  }

  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  try {
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      const refreshTokenHash = hashRefreshToken(refreshToken);

      await connectDB();

      const session = await SessionModel.findById(payload.sessionId)
        .select('refreshTokenHash')
        .lean<{ refreshTokenHash: string } | null>();

      if (session?.refreshTokenHash === refreshTokenHash) {
        await revokeSessionById(payload.sessionId);
      }

      await writeAuditEvent({
        userId: payload.userId,
        action: 'auth.logout.success',
        ipAddress,
        userAgent,
        metadata: { sessionId: payload.sessionId },
      });
    }
  } catch {
    // Best-effort session revocation.
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
  clearAllAuthCookies(response);
  return withSecurityHeaders(req, response);
}

export async function GET(req: NextRequest) {
  const nextPath = sanitizeRedirectTarget(req.nextUrl.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(nextPath, req.url));
  clearAllAuthCookies(response);
  return withSecurityHeaders(req, response);
}
