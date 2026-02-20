import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { clearAllAuthCookies, softDeleteUserAndRevokeSessions } from '@/lib/auth-session';
import connectDB from '@/utils/db';
import { authenticateRequest } from '@/middleware/authMiddleware';

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function DELETE(req: NextRequest) {
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
    await softDeleteUserAndRevokeSessions(userId);

    await writeAuditEvent({
      userId,
      action: 'auth.account.deleted',
      ipAddress,
      userAgent,
      metadata: {
        softDelete: true,
        sessionId: auth.context.sessionId,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account deleted',
      },
      { status: 200 }
    );
    clearAllAuthCookies(response);
    return withSecurityHeaders(req, response);
  } catch (err) {
    console.error('Delete account route error:', err);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
