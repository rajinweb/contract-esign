import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { sendPasswordResetEmail } from '@/lib/email';
import connectDB from '@/utils/db';
import { consumeRateLimit } from '@/lib/rateLimit';
import { isUserAllowed } from '@/lib/user-status';
import { getUserByEmail, generatePasswordResetToken } from '@/lib/forgotPasswordHelpers';

export const runtime = 'nodejs';

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email().max(320),
});

function successResponse(req: NextRequest) {
  return withSecurityHeaders(
    req,
    NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    )
  );
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

  const ipLimit = await consumeRateLimit({
    key: ipAddress,
    namespace: 'auth:forgot-password:ip',
    limit: 30,
    windowSeconds: 15 * 60,
  });

  if (!ipLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many reset attempts. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(ipLimit.retryAfterSeconds));
    return withSecurityHeaders(req, response);
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

  const parsed = ForgotPasswordSchema.safeParse(rawBody);
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

  const normalizedEmail = parsed.data.email.toLowerCase();

  const emailLimit = await consumeRateLimit({
    key: normalizedEmail,
    namespace: 'auth:forgot-password:email',
    limit: 5,
    windowSeconds: 15 * 60,
  });

  if (!emailLimit.allowed) {
    return successResponse(req);
  }

  try {
    await connectDB();

    const user = await getUserByEmail(normalizedEmail);

    if (!user || !isUserAllowed(user)) {
      await writeAuditEvent({
        action: 'auth.forgot_password.requested',
        ipAddress,
        userAgent,
        metadata: {
          email: normalizedEmail,
          userFound: false,
        },
      });

      return successResponse(req);
    }

    const resetToken = await generatePasswordResetToken(user._id.toString());

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').trim() || new URL(req.url).origin;
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendPasswordResetEmail(normalizedEmail, resetLink);

    await writeAuditEvent({
      userId: user._id,
      action: 'auth.forgot_password.requested',
      ipAddress,
      userAgent,
      metadata: {
        email: normalizedEmail,
        userFound: true,
      },
    });

    return successResponse(req);
  } catch (error) {
    console.error('Forgot password error:', error);

    await writeAuditEvent({
      action: 'auth.forgot_password.failed',
      ipAddress,
      userAgent,
      metadata: {
        email: normalizedEmail,
        reason: error instanceof Error ? error.message : 'unknown_error',
      },
    });

    return withSecurityHeaders(
      req,
      NextResponse.json(
        { error: 'An error occurred while processing your request.' },
        { status: 500 }
      )
    );
  }
}
