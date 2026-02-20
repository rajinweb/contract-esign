import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getClientIp,
  getUserAgent,
  isSecureRequest,
  validateCsrfToken,
  withSecurityHeaders,
} from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import UserModel from '@/models/Users';
import { authenticateRequest } from '@/middleware/authMiddleware';

export const runtime = 'nodejs';

const SignatureItemSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    type: z.enum(['typed', 'drawn']),
    value: z.string().max(500_000),
    isDefault: z.boolean().optional(),
  })
  .strict();

const AddressSchema = z
  .object({
    country: z.string().trim().max(100).optional(),
    street: z.string().trim().max(200).optional(),
    apartment: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    zip: z.string().trim().max(30).optional(),
  })
  .strict();

const ProfilePatchSchema = z
  .object({
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    picture: z.string().max(500_000).optional(),
    address: AddressSchema.optional(),
    initials: z.array(SignatureItemSchema).max(20).optional(),
    signatures: z.array(SignatureItemSchema).max(20).optional(),
    stamps: z.array(SignatureItemSchema).max(20).optional(),
  })
  .strict()
  .refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

type UserProfileProjection = {
  _id: unknown;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  phone?: string;
  address?: {
    country?: string;
    street?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
  initials?: Array<{ id: string; type: 'typed' | 'drawn'; value: string; isDefault?: boolean }>;
  signatures?: Array<{ id: string; type: 'typed' | 'drawn'; value: string; isDefault?: boolean }>;
  stamps?: Array<{ id: string; type: 'typed' | 'drawn'; value: string; isDefault?: boolean }>;
};

function toSafeProfile(user: UserProfileProjection) {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  return {
    id: String(user._id),
    email: user.email || '',
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    phone: user.phone || '',
    address: user.address || {},
    role: user.role || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    picture: user.picture || '',
    initials: user.initials || [],
    signatures: user.signatures || [],
    stamps: user.stamps || [],
  };
}

export async function OPTIONS(req: NextRequest) {
  return withSecurityHeaders(req, new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authenticated endpoints.' }, { status: 400 })
    );
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return withSecurityHeaders(req, auth.response);
  }

  try {
    const user = await UserModel.findById(auth.context.user._id)
      .select('email firstName lastName picture phone address role createdAt updatedAt initials signatures stamps')
      .lean<UserProfileProjection | null>();

    if (!user) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'User not found' }, { status: 404 })
      );
    }

    return withSecurityHeaders(req, NextResponse.json({ user: toSafeProfile(user) }, { status: 200 }));
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}

export async function PATCH(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!isSecureRequest(req)) {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'HTTPS is required for authenticated endpoints.' }, { status: 400 })
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    );
  }

  const parsed = ProfilePatchSchema.safeParse(body);
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

  const updatePayload = parsed.data;
  const update: Record<string, unknown> = {};

  if (updatePayload.firstName !== undefined) update.firstName = updatePayload.firstName;
  if (updatePayload.lastName !== undefined) update.lastName = updatePayload.lastName;
  if (updatePayload.phone !== undefined) update.phone = updatePayload.phone;
  if (updatePayload.picture !== undefined) update.picture = updatePayload.picture;
  if (updatePayload.address !== undefined) update.address = updatePayload.address;
  if (updatePayload.initials !== undefined) update.initials = updatePayload.initials;
  if (updatePayload.signatures !== undefined) update.signatures = updatePayload.signatures;
  if (updatePayload.stamps !== undefined) update.stamps = updatePayload.stamps;

  try {
    if (updatePayload.email !== undefined) {
      const normalizedEmail = updatePayload.email.toLowerCase();
      const emailOwner = await UserModel.findOne({
        email: normalizedEmail,
        _id: { $ne: auth.context.user._id },
      })
        .select('_id')
        .lean<{ _id: unknown } | null>();

      if (emailOwner) {
        return withSecurityHeaders(
          req,
          NextResponse.json({ message: 'Email is already in use' }, { status: 409 })
        );
      }

      update.email = normalizedEmail;
    }

    const hasNameChange = updatePayload.firstName !== undefined || updatePayload.lastName !== undefined;
    if (hasNameChange) {
      const currentUser = await UserModel.findById(auth.context.user._id)
        .select('firstName lastName')
        .lean<{ firstName?: string; lastName?: string } | null>();

      const firstName = updatePayload.firstName ?? currentUser?.firstName ?? '';
      const lastName = updatePayload.lastName ?? currentUser?.lastName ?? '';
      update.name = `${firstName} ${lastName}`.trim();
    }

    const updated = await UserModel.findByIdAndUpdate(
      auth.context.user._id,
      { $set: update },
      { new: true }
    )
      .select('email firstName lastName picture phone address role createdAt updatedAt initials signatures stamps')
      .lean<UserProfileProjection | null>();

    if (!updated) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'User not found' }, { status: 404 })
      );
    }

    await writeAuditEvent({
      userId: auth.context.user._id,
      action: 'user.profile.updated',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
        fields: Object.keys(update),
      },
    });

    return withSecurityHeaders(req, NextResponse.json({ user: toSafeProfile(updated) }, { status: 200 }));
  } catch (error) {
    console.error('PATCH /api/user/profile error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
