import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { getClientIp, isSecureRequest, withSecurityHeaders } from '@/lib/auth';
import connectDB from '@/utils/db';
import { consumeRateLimit } from '@/lib/rateLimit';
import Users from '@/models/Users';

const RegisterSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(128),
  name: z.string().trim().max(200).optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  picture: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
});

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authentication endpoints.' }, { status: 400 })
    );
  }

  const ipAddress = getClientIp(req);
  const rateLimit = await consumeRateLimit({
    key: ipAddress,
    namespace: 'auth:register:ip',
    limit: 30,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { message: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
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

  const parsed = RegisterSchema.safeParse(rawBody);
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

  const { email, password, name, firstName, lastName, picture } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  let resolvedFirstName = (firstName || '').trim();
  let resolvedLastName = (lastName || '').trim();
  const normalizedName = (name || '').trim();

  if ((!resolvedFirstName || !resolvedLastName) && normalizedName) {
    const parts = normalizedName.split(/\s+/).filter(Boolean);
    resolvedFirstName = resolvedFirstName || parts[0] || '';
    resolvedLastName = resolvedLastName || (parts.length > 1 ? parts.slice(1).join(' ') : '');
  }

  if (!resolvedFirstName && !resolvedLastName) {
    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          message: 'Validation failed',
          errors: ['Name is required'],
        },
        { status: 400 }
      )
    );
  }

  const normalizedPicture = typeof picture === 'string' && picture.trim().length > 0 ? picture.trim() : '';

  try {
    await connectDB();

    const existingUser = await Users.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'User already exists' }, { status: 400 })
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await Users.create({
      email: normalizedEmail,
      passwordHash,
      password: passwordHash,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim(),
      picture: normalizedPicture,
      isActive: true,
      isDeleted: false,
      role: 'user',
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockUntil: null,
      mfaEnabled: false,
      mfaSecret: null,
    });

    return withSecurityHeaders(
      req,
      NextResponse.json(
        {
          success: true,
          message: 'User registered successfully',
          user: {
            id: String(newUser._id),
            email: newUser.email,
          },
        },
        { status: 201 }
      )
    );
  } catch (error) {
    console.error('Register route error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
