import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { clearAllAuthCookies, revokeAllUserSessionsAndBumpTokenVersion } from '@/lib/auth-session';
import connectDB from '@/utils/db';
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

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
  }

  const userId = String(auth.context.user._id);

  try {
    await connectDB();
    await revokeAllUserSessionsAndBumpTokenVersion(userId);

    await writeAuditEvent({
      userId,
      action: 'auth.logout_all.success',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
      },
    });

    const response = NextResponse.json({ success: true, message: 'All sessions logged out' }, { status: 200 });
    clearAllAuthCookies(response);

    return withSecurityHeaders(req, response);
  } catch (error) {
    console.error('Logout-all route error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
