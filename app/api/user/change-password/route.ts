import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { clearAllAuthCookies } from '@/lib/auth-session';
import connectDB from '@/utils/db';
import SessionModel from '@/models/Session';
import UserModel from '@/models/Users';
import { authenticateRequest, enforceMfaForSensitiveAction } from '@/middleware/authMiddleware';

export const runtime = 'nodejs';

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6).max(128),
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional(),
});

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authentication endpoints.' }, { status: 400 })
    );
  }

  const auth = await authenticateRequest(req, {
    requireRecentAuth: true,
    maxAuthAgeSeconds: 10 * 60,
  });

  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
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

  const parsed = ChangePasswordSchema.safeParse(rawBody);
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

  const mfaCode = req.headers.get('x-mfa-code') || parsed.data.mfaCode || null;

  const mfaCheck = enforceMfaForSensitiveAction(auth.context, mfaCode);
  if (!mfaCheck.ok) {
    return withSecurityHeaders(req, mfaCheck.response);
  }

  const newPassword = parsed.data.newPassword;

  try {
    await connectDB();

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await UserModel.updateOne(
      { _id: auth.context.user._id },
      {
        $set: {
          passwordHash,
          password: passwordHash,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        $inc: {
          tokenVersion: 1,
        },
      }
    ).exec();

    await SessionModel.updateMany(
      { userId: auth.context.user._id },
      {
        $set: {
          revoked: true,
        },
      }
    ).exec();

    await writeAuditEvent({
      userId: auth.context.user._id,
      action: 'auth.password.changed',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
        requiresRelogin: true,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      },
      { status: 200 }
    );

    clearAllAuthCookies(response);

    return withSecurityHeaders(req, response);
  } catch (err) {
    console.error('Change password route error:', err);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
