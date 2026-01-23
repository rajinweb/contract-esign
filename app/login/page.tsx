'use client';
import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import GoogleSignInButton from '@/components/GoogleSignInButton'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import Input from '@/components/forms/Input';
import toast from 'react-hot-toast';
import { Eye, EyeOff} from 'lucide-react';
import Link from 'next/link';

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
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    setFormError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMessage = json?.message || 'Login failed';
        setFormError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (json?.user) {
        localStorage.setItem('User', JSON.stringify(json.user));
        setUser(json.user);
      }
      setIsLoggedIn(true);
      router.replace('/dashboard');
      setShowModal(false)
    } catch (err) {
      console.error(err);
      const errorMessage = 'Network error. Please try again.';
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full px-4"  data-testid="login-modal">
      {/* Login Card */}
      <div className="relative max-w-[500px]  mx-auto">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6">
          {/* Heading */}
          <h3 className="text-lg font-medium text-[#020817] text-center mb-2">
            Log in with ease
          </h3>
          <p className="text-xs text-[#64748B] text-center mb-6">
            Log in with your Social Media Accounts
          </p>

          {/* Social Login Buttons */}
          <div className="flex gap-3 mb-4 text-sm">
            <button 
              type="button"
              className="flex-1 h-10 rounded-md border border-[#E2E8F0] bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 9.0525C16.5 4.86 13.14 1.5 8.9475 1.5C4.755 1.5 1.5 4.86 1.5 9.0525C1.5 12.8175 4.245 15.945 7.83 16.5375V11.25H5.925V9.0525H7.83V7.35C7.83 5.475 8.9475 4.44 10.6575 4.44C11.475 4.44 12.33 4.59 12.33 4.59V6.4275H11.385C10.455 6.4275 10.1625 7.005 10.1625 7.5975V9.015H12.2475L11.9175 11.2125H10.1625V16.5C13.755 15.945 16.5 12.8175 16.5 9.0525Z" fill="#1877F2"/>
              </svg>
              <span>Facebook</span>
            </button>
          {/* Include the Google Sign-In button */}
          <div className="flex-1 justify-center">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
              <GoogleSignInButton />
            </GoogleOAuthProvider>
            {/* Add other social login buttons here */}
          </div>
            <button 
              type="button"
              className="flex-1 h-10 rounded-md border border-[#E2E8F0] bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 1.5H1.5V9H9V1.5Z" fill="#F25022"/>
                <path d="M16.5 1.5H9V9H16.5V1.5Z" fill="#7FBA00"/>
                <path d="M9 9H1.5V16.5H9V9Z" fill="#00A4EF"/>
                <path d="M16.5 9H9V16.5H16.5V9Z" fill="#FFB900"/>
              </svg>
              <span>Microsoft</span>
            </button>
          </div>

          {/* Divider */}
          <div className="text-center mb-4">
            <span className="text-xs text-[#64748B] uppercase font-poppins">or</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{formError}</span>
              </div>
            )}
            {/* Email Input */}
            <div className="mb-3">
              <Input
                type="email"
                placeholder="name@example.com"
                {...register('email', { required: 'Email required' })}
                className="w-full h-[38px] px-3 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-3 relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                {...register('password', { required: 'Password required' })}
                className="w-full h-[38px] px-3 pr-10 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              {formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="mb-4">
              <Link href="/forgot-password" className="text-xs text-blue-500 hover:underline">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={formState.isSubmitting}
              className="primary-button w-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState.isSubmitting ? 'Logging in...' : 'Log in'}
            </button>

            {/* Sign Up Link */}
            <p className="text-xs text-center mt-4 font-poppins">
              <span className="text-[#64748B]">No account? </span>
              <Link href="/register" className="text-blue-500 hover:underline">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
        {/* Terms and Privacy */}
        <p className="text-xs text-center mt-4 font-poppins leading-4">
          <span className="text-[#64748B]">By clicking Log in or Sign up, you agree to the </span>
          <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link>
          <span className="text-[#64748B]"> and </span>
          <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Notice</Link>
        </p>
      
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
