import type { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET as logoutGet } from '@/app/api/auth/logout/route';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@/lib/auth';
import { proxy } from '@/proxy';

type CookieCall = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

function createMockResponse(): {
  response: NextResponse;
  cookieCalls: CookieCall[];
  appendedSetCookies: string[];
} {
  const cookieCalls: CookieCall[] = [];
  const appendedSetCookies: string[] = [];

  const response = {
    cookies: {
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        cookieCalls.push({ name, value, options });
      },
    },
    headers: {
      append: (name: string, value: string) => {
        if (name.toLowerCase() === 'set-cookie') {
          appendedSetCookies.push(value);
        }
      },
    },
  } as unknown as NextResponse;

  return { response, cookieCalls, appendedSetCookies };
}

function createMockRequest(pathname: string, hasRefreshCookie: boolean): NextRequest {
  return {
    nextUrl: { pathname },
    cookies: {
      get: (name: string) => {
        if (name === 'refresh_token' && hasRefreshCookie) {
          return { name, value: 'refresh-token-value' };
        }
        return undefined;
      },
    },
    url: `http://localhost:3000${pathname}`,
  } as unknown as NextRequest;
}

describe('auth cookie regression guards', () => {
  it('clears refresh cookie on root path and legacy API paths', () => {
    const { response, cookieCalls, appendedSetCookies } = createMockResponse();

    clearRefreshTokenCookie(response);

    const rootClear = cookieCalls.find(
      (call) => call.name === 'refresh_token' && call.value === '' && call.options?.path === '/'
    );
    expect(rootClear).toBeDefined();

    expect(appendedSetCookies.some((header) => header.includes('refresh_token=') && header.includes('Path=/api'))).toBe(
      true
    );
    expect(
      appendedSetCookies.some((header) => header.includes('refresh_token=') && header.includes('Path=/api/auth'))
    ).toBe(true);
  });

  it('sets refresh cookie on root path and clears legacy API-path duplicates', () => {
    const { response, cookieCalls, appendedSetCookies } = createMockResponse();

    setRefreshTokenCookie(response, 'new-refresh-token', new Date(Date.now() + 60_000));

    const rootSet = cookieCalls.find(
      (call) =>
        call.name === 'refresh_token' &&
        call.value === 'new-refresh-token' &&
        call.options?.path === '/' &&
        call.options?.httpOnly === true
    );
    expect(rootSet).toBeDefined();

    expect(appendedSetCookies.some((header) => header.includes('refresh_token=') && header.includes('Path=/api'))).toBe(
      true
    );
    expect(
      appendedSetCookies.some((header) => header.includes('refresh_token=') && header.includes('Path=/api/auth'))
    ).toBe(true);
  });
});

describe('proxy redirect regression guards', () => {
  it('does not redirect /login to /dashboard solely on refresh cookie presence', () => {
    const req = createMockRequest('/login', true);
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not redirect root path solely on refresh cookie presence', () => {
    const req = createMockRequest('/', true);
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not make auth decisions for protected routes', () => {
    const req = createMockRequest('/dashboard', false);
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('logout redirect sanitization', () => {
  it('rejects protocol-relative next targets', async () => {
    const req = {
      nextUrl: new URL('http://localhost:3000/api/auth/logout?next=//evil.com'),
      url: 'http://localhost:3000/api/auth/logout?next=//evil.com',
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await logoutGet(req);
    const location = res.headers.get('location') || '';

    expect(location).toContain('/login');
    expect(location).not.toContain('evil.com');
  });

  it('keeps safe internal next targets', async () => {
    const req = {
      nextUrl: new URL('http://localhost:3000/api/auth/logout?next=/dashboard'),
      url: 'http://localhost:3000/api/auth/logout?next=/dashboard',
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await logoutGet(req);
    const location = res.headers.get('location') || '';

    expect(location).toContain('/dashboard');
  });
});
