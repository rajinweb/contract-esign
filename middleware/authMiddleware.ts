import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import connectDB from '@/utils/db';
import { getAccessTokenFromRequest, unauthorizedResponse } from '@/lib/auth';
import { AccessTokenPayload, isJwtConfigurationError, verifyAccessToken } from '@/lib/jwt';
import { isMfaConfigurationError, verifyTotpCode } from '@/lib/mfa';
import { isUserAllowed } from '@/lib/user-status';
import SessionModel from '@/models/Session';
import UserModel from '@/models/Users';

interface AuthDbUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: string;
  tokenVersion: number;
  isActive?: boolean;
  isDeleted?: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string | null;
}

export interface AuthenticatedContext {
  user: Pick<AuthDbUser, '_id' | 'email' | 'role' | 'tokenVersion' | 'mfaEnabled' | 'mfaSecret'>;
  token: AccessTokenPayload;
  sessionId: string;
}

export type AuthResult =
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; response: NextResponse };

interface AuthOptions {
  requireRecentAuth?: boolean;
  maxAuthAgeSeconds?: number;
}

function toUserProjection(user: AuthDbUser): AuthenticatedContext['user'] {
  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    mfaEnabled: user.mfaEnabled,
    mfaSecret: user.mfaSecret,
  };
}

export async function authenticateRequest(
  req: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return {
      ok: false,
      response: unauthorizedResponse({ message: 'Missing access token' }),
    };
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (isJwtConfigurationError(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Authentication service is misconfigured. Missing or invalid JWT key material.' },
          { status: 500 }
        ),
      };
    }

    return {
      ok: false,
      response: unauthorizedResponse({ message: 'Invalid or expired access token' }),
    };
  }

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(payload.userId)) {
    return {
      ok: false,
      response: unauthorizedResponse({ message: 'Invalid token subject' }),
    };
  }

  const user = await UserModel.findById(payload.userId)
    .select('email role tokenVersion isActive isDeleted mfaEnabled mfaSecret')
    .lean<AuthDbUser | null>();

  if (!user || !isUserAllowed(user)) {
    return {
      ok: false,
      response: unauthorizedResponse({ message: 'User is inactive or deleted' }),
    };
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return {
      ok: false,
      response: unauthorizedResponse({ message: 'Token has been revoked' }),
    };
  }

  const session = await SessionModel.findById(payload.sessionId)
    .select('userId revoked expiresAt')
    .lean<{ userId: mongoose.Types.ObjectId; revoked: boolean; expiresAt: Date } | null>();

  if (
    !session ||
    session.revoked ||
    session.userId.toString() !== payload.userId ||
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    return {
      ok: false,
      response: unauthorizedResponse({ message: 'Session is invalid or expired' }),
    };
  }

  const requireRecentAuth = options.requireRecentAuth ?? false;
  const maxAgeSeconds = options.maxAuthAgeSeconds ?? 10 * 60;
  if (requireRecentAuth) {
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.authTime;
    if (ageSeconds > maxAgeSeconds) {
      return {
        ok: false,
        response: unauthorizedResponse({
          message: 'Recent authentication required',
          reason: 'reauth_required',
        }),
      };
    }
  }

  return {
    ok: true,
    context: {
      user: toUserProjection(user),
      token: payload,
      sessionId: payload.sessionId,
    },
  };
}

export function enforceMfaForSensitiveAction(
  context: AuthenticatedContext,
  providedCode: string | null | undefined
): AuthResult {
  if (!context.user.mfaEnabled) {
    return { ok: true, context };
  }

  if (!context.user.mfaSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: 'MFA is enabled but secret is missing. Please reconfigure MFA.',
          reason: 'mfa_misconfigured',
        },
        { status: 403 }
      ),
    };
  }

  let isValid = false;
  try {
    isValid = verifyTotpCode(context.user.mfaSecret, providedCode || '');
  } catch (error) {
    if (isMfaConfigurationError(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            message: 'MFA service is misconfigured. Please contact support.',
            reason: 'mfa_misconfigured',
          },
          { status: 500 }
        ),
      };
    }
    throw error;
  }

  if (!isValid) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: 'A valid MFA code is required for this action.',
          reason: 'mfa_required',
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, context };
}
