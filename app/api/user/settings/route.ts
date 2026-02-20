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

const DATE_FORMATS = ['MM/DD/YYYY (US)', 'DD/MM/YYYY (EU)', 'YYYY-MM-DD (ISO)'] as const;

const SettingsSchema = z
  .object({
    twoFactor: z.boolean().optional(),
    displayEsignId: z.boolean().optional(),
    dateFormat: z.enum(DATE_FORMATS).optional(),
    inviteSubject: z.string().trim().min(1).max(300).optional(),
    inviteMessage: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

type SettingsShape = {
  twoFactor: boolean;
  displayEsignId: boolean;
  dateFormat: (typeof DATE_FORMATS)[number];
  inviteSubject: string;
  inviteMessage: string;
};

function normalizeSettings(raw: unknown): SettingsShape {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    twoFactor: input.twoFactor === true,
    displayEsignId: input.displayEsignId !== false,
    dateFormat: DATE_FORMATS.includes(input.dateFormat as SettingsShape['dateFormat'])
      ? (input.dateFormat as SettingsShape['dateFormat'])
      : 'MM/DD/YYYY (US)',
    inviteSubject:
      typeof input.inviteSubject === 'string' && input.inviteSubject.trim().length > 0
        ? input.inviteSubject.trim()
        : 'Document Name: Signature Request from Sender name',
    inviteMessage:
      typeof input.inviteMessage === 'string' && input.inviteMessage.trim().length > 0
        ? input.inviteMessage.trim()
        : 'Sender name invited you to sign Document Name',
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
      .select('settings')
      .lean<{ settings?: unknown } | null>();

    if (!user) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'User not found' }, { status: 404 })
      );
    }

    return withSecurityHeaders(req, NextResponse.json(normalizeSettings(user.settings), { status: 200 }));
  } catch (error) {
    console.error('GET /api/user/settings error:', error);
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

  const parsed = SettingsSchema.safeParse(body);
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
    const existing = await UserModel.findById(auth.context.user._id)
      .select('settings')
      .lean<{ settings?: unknown } | null>();
    if (!existing) {
      return withSecurityHeaders(
        req,
        NextResponse.json({ message: 'User not found' }, { status: 404 })
      );
    }

    const merged = normalizeSettings({
      ...normalizeSettings(existing.settings),
      ...parsed.data,
    });

    await UserModel.updateOne(
      { _id: auth.context.user._id },
      {
        $set: {
          settings: merged,
        },
      }
    ).exec();

    await writeAuditEvent({
      userId: auth.context.user._id,
      action: 'user.settings.updated',
      ipAddress,
      userAgent,
      metadata: {
        sessionId: auth.context.sessionId,
      },
    });

    return withSecurityHeaders(req, NextResponse.json({ success: true, settings: merged }, { status: 200 }));
  } catch (error) {
    console.error('PATCH /api/user/settings error:', error);
    return withSecurityHeaders(
      req,
      NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    );
  }
}
