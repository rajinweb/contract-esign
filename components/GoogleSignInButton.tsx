'use client';
import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';

const GoogleSignInButton: React.FC = () => {
  const {setIsLoggedIn, setUser} = useContextStore();
  const router = useRouter();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const googleToken = credentialResponse?.credential;
    if (!googleToken) return;

    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken }),
    });

    if (!res.ok) {
      console.error('Server verification failed');
      return;
    }

    const data = await res.json();
    if (data?.user) {
      // Cookie-based flow: server set httpOnly cookie and returned user
      localStorage.setItem('User', JSON.stringify(data.user));
      if (data?.token) {
        localStorage.setItem('AccessToken', data.token);
      }
      setUser(data.user);
      setIsLoggedIn(true);
      router.replace('/dashboard');
    }
};

  const handleError = () => {
    console.log('Google sign-in failed');
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};

export default GoogleSignInButton;
