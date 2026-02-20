import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import connectDB from '@/utils/db';
import { consumeRateLimit } from '@/lib/rateLimit';
import SessionModel from '@/models/Session';
import Users from '@/models/Users';

export const runtime = 'nodejs';

const ResetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(512),
  newPassword: z.string().min(6).max(128),
});

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
    namespace: 'auth:reset-password:ip',
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

  const parsed = ResetPasswordSchema.safeParse(rawBody);
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

  try {
    await connectDB();

    const { token, newPassword } = parsed.data;

    // Hash the incoming raw token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by stored hashed token + expiry
    const user = await Users.findOne({
      'passwordResetToken.token': hashedToken,
      'passwordResetToken.expires': { $gt: new Date() },
    });

    if (!user) {
      await writeAuditEvent({
        action: 'auth.reset_password.failed',
        ipAddress,
        userAgent,
        metadata: {
          reason: 'invalid_or_expired_token',
        },
      });

      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 })
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updateResult = await Users.updateOne(
      {
        _id: user._id,
        'passwordResetToken.token': hashedToken,
        'passwordResetToken.expires': { $gt: new Date() },
      },
      {
        $set: {
          passwordHash: hashedPassword,
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockUntil: null,
          passwordResetToken: { token: null, expires: null },
        },
        $inc: {
          tokenVersion: 1,
        },
      }
    ).exec();

    if (updateResult.modifiedCount !== 1) {
      await writeAuditEvent({
        action: 'auth.reset_password.failed',
        ipAddress,
        userAgent,
        metadata: {
          userId: String(user._id),
          reason: 'stale_or_already_used_token',
        },
      });

      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 })
      );
    }

    await SessionModel.updateMany({ userId: user._id }, { $set: { revoked: true } }).exec();

    await writeAuditEvent({
      userId: user._id,
      action: 'auth.reset_password.success',
      ipAddress,
      userAgent,
      metadata: {
        sessionRevoked: true,
      },
    });

    return withSecurityHeaders(req, NextResponse.json({ success: true }, { status: 200 }));
  } catch (error) {
    console.error('Password reset error:', error);

    await writeAuditEvent({
      action: 'auth.reset_password.failed',
      ipAddress,
      userAgent,
      metadata: {
        reason: error instanceof Error ? error.message : 'unknown_error',
      },
    });

    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Something went wrong' }, { status: 500 })
    );
  }
}
