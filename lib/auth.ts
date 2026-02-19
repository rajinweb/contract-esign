import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

interface TokenClaims {
  id?: string;
  email?: string;
}

interface AuthTokenPayload {
  id: string;
  email?: string;
}

interface UserIdOptions {
  allowGuest?: boolean;
}

const AUTH_COOKIE_NAME = 'token';
const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 3600;
const AUTH_TOKEN_TTL = '7d';

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) return null;
  return secret;
}

function getTokenFromReq(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (bearer) return bearer;
  return req.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export function getJwtClaimsFromReq(req: NextRequest): TokenClaims | null {
  const token = getTokenFromReq(req);
  const secret = getJwtSecret();

  if (!token || !secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload & { id?: string; email?: string };
    return {
      id: typeof decoded.id === 'string' ? decoded.id : undefined,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
    };
  } catch {
    return null;
  }
}

export function createAuthToken(payload: AuthTokenPayload): string | null {
  const secret = getJwtSecret();
  if (!secret) return null;
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
    },
    secret,
    { expiresIn: AUTH_TOKEN_TTL }
  );
}

export function setAuthTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

// ---------------- JWT Helper ----------------
export async function getUserIdFromReq(
  req: NextRequest,
  options: UserIdOptions = {}
): Promise<string | null> {
  const claims = getJwtClaimsFromReq(req);
  if (claims?.id) {
    return claims.id;
  }

  if (!options.allowGuest) {
    return null;
  }

  // Only check for guestId if no valid JWT token was found
  // This allows guest access but prevents JWT bypass via URL manipulation
  // IMPORTANT: Validate guestId format to prevent user ID spoofing
  // Guest IDs must start with "guest_" prefix - reject any other format
  const url = new URL(req.url);
  const guestId = url.searchParams.get('guestId');
  if (guestId) {
    // Only accept guest IDs that start with "guest_" prefix
    // This prevents attackers from passing legitimate user IDs as guestId
    if (guestId.startsWith('guest_')) {
      return guestId;
    }
    // Invalid format - reject it to prevent user ID spoofing
    return null;
  }

  return null;
}
