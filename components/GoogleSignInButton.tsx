'use client';
import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';

const GoogleSignInButton: React.FC = () => {
  const router = useRouter();
  const handleSuccess = (credentialResponse: CredentialResponse) => {
    console.log('Sign-in successful:', credentialResponse);
    router.push('/builder');
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