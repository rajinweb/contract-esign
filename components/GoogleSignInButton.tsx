'use client';
import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';

const GoogleSignInButton: React.FC = () => {
   const {setIsLoggedIn} = useContextStore();
  const router = useRouter();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    console.log('Sign-in successful:', credentialResponse);
    const token = credentialResponse?.credential;
    
    if (!token) return;

    await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

  
    localStorage.setItem('AccessToken', token as string);     
    setIsLoggedIn(true);
    router.replace('/dashboard'); 
    
    // Implement your backend logic here to verify the credentialResponse.
    // You will typically send the credentialResponse.credential (ID token)
    // to your server for verification and user authentication.
  };

  const handleError = () => {
    console.log('Sign-in failed');
    // Handle the error, e.g., display a message to the user
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};

export default GoogleSignInButton;