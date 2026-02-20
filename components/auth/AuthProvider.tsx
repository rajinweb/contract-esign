'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearInMemoryAccessToken,
  getInMemoryAccessToken,
  setInMemoryAccessToken,
} from '@/lib/accessTokenStore';
import { getCookieValue } from '@/utils/cookies';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  picture?: string;
}

interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
  deviceInfo?: string;
}

interface GoogleLoginInput {
  token: string;
  totpCode?: string;
}

interface LoginResult {
  mfaRequired?: boolean;
  message?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<LoginResult>;
  loginWithGoogle: (input: GoogleLoginInput) => Promise<LoginResult>;
  updateUser: (updates: Partial<AuthUser>) => void;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTHLESS_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/user/reset-password',
]);

function getPathname(input: RequestInfo | URL): string | null {
  try {
    if (typeof input === 'string') {
      if (input.startsWith('/')) {
        return input.split('?')[0];
      }
      return new URL(input).pathname;
    }

    if (input instanceof URL) {
      return input.pathname;
    }

    return new URL(input.url).pathname;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const clearSessionState = useCallback(() => {
    accessTokenRef.current = null;
    clearInMemoryAccessToken();
    setAccessToken(null);
    setUser(null);
  }, []);

  const applyAuthenticatedSession = useCallback((payload: {
    accessToken?: string;
    token?: string;
    user?: AuthUser;
  }): void => {
    const token = payload.accessToken || payload.token;
    if (!token || !payload.user) {
      throw new Error('Authentication response is missing required fields');
    }

    accessTokenRef.current = token;
    setInMemoryAccessToken(token);
    setAccessToken(token);
    setUser(payload.user);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const csrfToken = getCookieValue('csrf_token');
    if (!csrfToken) {
      clearSessionState();
      return false;
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    });

    if (!response.ok) {
      clearSessionState();
      return false;
    }

    const payload = (await response.json()) as {
      accessToken?: string;
      user?: AuthUser;
    };

    if (!payload.accessToken || !payload.user) {
      clearSessionState();
      return false;
    }

    applyAuthenticatedSession(payload);
    return true;
  }, [applyAuthenticatedSession, clearSessionState]);

  const login = useCallback(async (input: LoginInput): Promise<LoginResult> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      accessToken?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || 'Login failed');
    }

    if (payload.mfaRequired) {
      return { mfaRequired: true, message: payload.message };
    }

    applyAuthenticatedSession(payload);

    return {};
  }, [applyAuthenticatedSession]);

  const loginWithGoogle = useCallback(async (input: GoogleLoginInput): Promise<LoginResult> => {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      accessToken?: string;
      token?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      message?: string;
    };

    if (!response.ok) {
      if (payload.mfaRequired) {
        return { mfaRequired: true, message: payload.message };
      }
      throw new Error(payload.message || 'Google authentication failed');
    }

    if (payload.mfaRequired) {
      return { mfaRequired: true, message: payload.message };
    }

    applyAuthenticatedSession(payload);

    return {};
  }, [applyAuthenticatedSession]);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      const merged = {
        ...current,
        ...updates,
      };

      if (updates.firstName !== undefined || updates.lastName !== undefined) {
        merged.name = `${merged.firstName || ''} ${merged.lastName || ''}`.trim();
      }

      return merged;
    });
  }, []);

  const logout = useCallback(async () => {
    const csrfToken = getCookieValue('csrf_token');

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }).catch(() => undefined);

    clearSessionState();
  }, [clearSessionState]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await refreshAccessToken();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const interval = setInterval(() => {
      void refreshAccessToken();
    }, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshAccessToken]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const patchedFetch: typeof fetch = async (input, init) => {
      const path = getPathname(input);
      const isApiRequest = Boolean(path && path.startsWith('/api/'));
      const skipAuthInjection = Boolean(path && AUTHLESS_API_PATHS.has(path));
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const requiresCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

      if (!isApiRequest) {
        return originalFetch(input, init);
      }

      const initialHeaders = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      let token = accessTokenRef.current || getInMemoryAccessToken();
      if (token && !skipAuthInjection && !initialHeaders.has('Authorization')) {
        initialHeaders.set('Authorization', `Bearer ${token}`);
      }
      if (requiresCsrf) {
        const csrfToken = getCookieValue('csrf_token');
        if (csrfToken) {
          // Always sync to the latest cookie value to avoid stale-token retries after refresh rotation.
          initialHeaders.set('X-CSRF-Token', csrfToken);
        }
      }

      const buildInit = (headers: Headers): RequestInit => ({
        ...init,
        headers,
        credentials: init?.credentials || 'include',
      });

      let response = await originalFetch(input, buildInit(initialHeaders));

      if (
        response.status === 401 &&
        !skipAuthInjection &&
        path !== '/api/auth/refresh'
      ) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const retryHeaders = new Headers(
            init?.headers || (input instanceof Request ? input.headers : undefined)
          );
          token = accessTokenRef.current || getInMemoryAccessToken();
          if (token && !retryHeaders.has('Authorization')) {
            retryHeaders.set('Authorization', `Bearer ${token}`);
          }
          if (requiresCsrf) {
            const csrfToken = getCookieValue('csrf_token');
            if (csrfToken) {
              retryHeaders.set('X-CSRF-Token', csrfToken);
            }
          }
          response = await originalFetch(input, buildInit(retryHeaders));
        }
      }

      return response;
    };

    window.fetch = patchedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [refreshAccessToken]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      loginWithGoogle,
      updateUser,
      refreshAccessToken,
      logout,
    }),
    [user, accessToken, isLoading, login, loginWithGoogle, updateUser, refreshAccessToken, logout]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
