'use client';
import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';

const GoogleSignInButton: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isAuthenticating) {
      return;
    }

    const googleToken = credentialResponse?.credential;
    if (!googleToken) {
      toast.error('Google login did not return a valid token');
      return;
    }

    setIsAuthenticating(true);
    setStatusMessage('Verifying Google account...');

    let shouldKeepBusyState = false;
    try {
      let result = await loginWithGoogle({ token: googleToken });

      if (result.mfaRequired) {
        setStatusMessage('MFA required. Waiting for verification code...');
        const promptedCode = window.prompt('Enter your 6-digit authenticator code');
        if (!promptedCode) {
          toast.error(result.message || 'MFA verification is required.');
          setStatusMessage(null);
          return;
        }

        setStatusMessage('Verifying MFA code...');
        result = await loginWithGoogle({ token: googleToken, totpCode: promptedCode.trim() });
        if (result.mfaRequired) {
          toast.error(result.message || 'Invalid MFA code.');
          setStatusMessage(null);
          return;
        }
      }

      shouldKeepBusyState = true;
      setStatusMessage('Login successful. Redirecting to dashboard...');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google authentication failed';
      console.error('Server verification failed', message);
      toast.error(message);
      setStatusMessage(null);
    } finally {
      if (!shouldKeepBusyState) {
        setIsAuthenticating(false);
      }
    }
  };

  const handleError = () => {
    setIsAuthenticating(false);
    setStatusMessage(null);
    toast.error('Google sign-in failed');
  };

  return (
    <div className="relative">
      <div className={isAuthenticating ? 'pointer-events-none opacity-75' : ''}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
      {isAuthenticating && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{statusMessage || 'Signing in with Google...'}</span>
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
