import { NextRequest, NextResponse } from 'next/server';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { verifyEmailTransport } from '@/lib/email';
import { consumeRateLimit } from '@/lib/rateLimit';
import { authenticateRequest } from '@/middleware/authMiddleware';

export const runtime = 'nodejs';

function isDebugEndpointEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_SMTP_DEBUG_ENDPOINT === 'true';
}

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!isDebugEndpointEnabled()) {
    return withSecurityHeaders(req, NextResponse.json({ message: 'Not Found' }, { status: 404 }));
  }

  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authentication endpoints.' }, { status: 400 })
    );
  }

  const rateLimit = await consumeRateLimit({
    key: ipAddress,
    namespace: 'auth:smtp-verify:ip',
    limit: 20,
    windowSeconds: 15 * 60,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many SMTP verification requests. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return withSecurityHeaders(req, response);
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
  }

  try {
    const diagnostics = await verifyEmailTransport();
    const smtpVerified = diagnostics.smtp?.verified ?? false;

    await writeAuditEvent({
      userId: String(auth.context.user._id),
      action: 'auth.smtp_verify.checked',
      ipAddress,
      userAgent,
      metadata: {
        provider: diagnostics.provider,
        smtpConfigured: diagnostics.smtpConfigured,
        smtpVerified,
        smtpHost: diagnostics.smtp?.host,
        smtpPort: diagnostics.smtp?.port,
        smtpSecure: diagnostics.smtp?.secure,
        sessionId: auth.context.sessionId,
      },
    });

    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          ok: smtpVerified,
          diagnostics,
        },
        { status: 200 }
      )
    );
  } catch (error) {
    await writeAuditEvent({
      userId: String(auth.context.user._id),
      action: 'auth.smtp_verify.failed',
      ipAddress,
      userAgent,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown_error',
        sessionId: auth.context.sessionId,
      },
    });

    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'SMTP verification failed.' }, { status: 500 })
    );
  }
}
