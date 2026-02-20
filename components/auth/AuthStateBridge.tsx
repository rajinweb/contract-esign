'use client';

import { useEffect } from 'react';

import useContextStore from '@/hooks/useContextStore';

import { useAuth } from './AuthProvider';

export default function AuthStateBridge() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { setIsLoggedIn, setUser } = useContextStore();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user) {
      setIsLoggedIn(true);
      setUser((current) => {
        if (current?.id === user.id && current?.email === user.email && current?.role === user.role) {
          return {
            ...current,
            ...user,
          };
        }

        return {
          ...user,
        };
      });
      return;
    }

    setIsLoggedIn(false);
    setUser(null);
  }, [isAuthenticated, isLoading, setIsLoggedIn, setUser, user]);

  return null;
}
