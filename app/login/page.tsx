'use client';
import React, { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import GoogleSignInButton from '@/components/GoogleSignInButton'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import Input from '@/components/forms/Input';
import toast from 'react-hot-toast';

type FormValues = {
  email: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const { setIsLoggedIn, setUser, setShowModal } = useContextStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || ""; 
  const { register, handleSubmit, formState } = useForm<FormValues>({ defaultValues: { email: emailFromUrl ? emailFromUrl : '', password: '' } });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message || 'Login failed')
        return;
      }

      if (json?.token) localStorage.setItem('AccessToken', json.token);
      if (json?.user) {
        localStorage.setItem('User', JSON.stringify(json.user));
        setUser(json.user);
      }
      setIsLoggedIn(true);
      router.replace('/dashboard');
      setShowModal(false)
    } catch (err) {
      console.error(err);
      toast('Network error')
    }
  };

  return (
    
      <div className="px-8 py-6 text-left bg-white shadow-lg rounded-lg w-full max-w-md  m-auto mt-20">
        <h3 className="text-2xl font-bold text-center">Login to SecureSign</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-4">
            <div>
              <Input label="Email" type="email" {...register('email', { required: 'Email required' })} error={formState.errors.email?.message} />
            </div>
            <div className="mt-4">
              <Input label="Password" type="password" {...register('password', { required: 'Password required' })} error={formState.errors.password?.message} />
            </div>
              <button type="submit" className="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-900">
                {formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</a>
          
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
        
          <p className="relative after:content-[''] my-4 text-sm after:border-b after:block after:absolute after:w-full after:-mt-[10px] after:z-2">
            <span className='bg-white relative z-20 '>or sign up with</span>
          </p>
       
          {/* Include the Google Sign-In button */}
          <div className="flex justify-center mt-4">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
              <GoogleSignInButton />
            </GoogleOAuthProvider>
            {/* Add other social login buttons here */}
          </div>
          <p className="mt-4 text-center text-gray-600 text-sm">
            Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline">Register here.</a>
          </p>
        </div>
      </div>
   
  );
};


export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}