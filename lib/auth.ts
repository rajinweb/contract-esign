import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { serialize as serializeCookie } from 'cookie';
import { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'token'; // legacy cookie
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
export const CSRF_COOKIE_NAME = 'csrf_token';

const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 3600;
const LEGACY_COOKIE_PATHS = ['/api', '/api/auth'] as const;

function appendLegacyCookieClearHeaders(
  response: NextResponse,
  name: string,
  options: {
    httpOnly: boolean;
    sameSite: 'lax' | 'strict';
  }
): void {
  const secure = process.env.NODE_ENV === 'production';
  for (const path of LEGACY_COOKIE_PATHS) {
    response.headers.append(
      'Set-Cookie',
      serializeCookie(name, '', {
        httpOnly: options.httpOnly,
        secure,
        sameSite: options.sameSite,
        path,
        maxAge: 0,
        expires: new Date(0),
      })
    );
  }
}

export function clearAuthTokenCookie(response: NextResponse): void {
  appendLegacyCookieClearHeaders(response, AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function issueCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function setCsrfCookie(response: NextResponse, csrfToken: string): void {
  appendLegacyCookieClearHeaders(response, CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: 'strict',
  });

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearCsrfCookie(response: NextResponse): void {
  appendLegacyCookieClearHeaders(response, CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: 'strict',
  });

  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function setRefreshTokenCookie(response: NextResponse, refreshToken: string, expiresAt: Date): void {
  const secondsUntilExpiry = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 0);

  appendLegacyCookieClearHeaders(response, REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: secondsUntilExpiry,
    expires: expiresAt,
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  appendLegacyCookieClearHeaders(response, REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function validateCsrfToken(req: NextRequest): boolean {
  const headerToken = req.headers.get('x-csrf-token') || '';
  if (!headerToken) {
    return false;
  }

  const cookieTokens = req.cookies
    .getAll(CSRF_COOKIE_NAME)
    .map((cookie) => cookie.value)
    .filter(Boolean);

  if (cookieTokens.length === 0) {
    return false;
  }

  return cookieTokens.some((cookieToken) => safeCompare(cookieToken, headerToken));
}

export function hashRefreshToken(token: string): string {
  const pepper = process.env.REFRESH_TOKEN_PEPPER || '';
  return createHash('sha256').update(`${token}:${pepper}`).digest('hex');
}

export function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function getAccessTokenFromRequest(req: NextRequest): string | null {
  return extractBearerToken(req);
}

export function getGuestIdFromReq(req: NextRequest): string | null {
  const url = new URL(req.url);
  const guestId = url.searchParams.get('guestId');
  if (!guestId) return null;
  return guestId.startsWith('guest_') ? guestId : null;
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.headers.get('x-real-ip') || 'unknown';
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

export function isSecureRequest(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.includes('https');
  }

  return req.nextUrl.protocol === 'https:';
}

function resolveAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS;
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  return publicBaseUrl ? [publicBaseUrl] : [];
}

export function applyCorsHeaders(req: NextRequest, response: NextResponse): void {
  const allowedOrigins = resolveAllowedOrigins();
  const origin = req.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    response.headers.set('Vary', 'Origin');
  }
}

export function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

export function withSecurityHeaders(req: NextRequest, response: NextResponse): NextResponse {
  applyCorsHeaders(req, response);
  applySecurityHeaders(response);
  return response;
}

export function unauthorizedResponse(
  body: Record<string, unknown> = { message: 'Unauthorized' }
): NextResponse {
  const response = NextResponse.json(body, { status: 401 });
  clearAuthTokenCookie(response);
  clearRefreshTokenCookie(response);
  clearCsrfCookie(response);
  applySecurityHeaders(response);
  return response;
}
