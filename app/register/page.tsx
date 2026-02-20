'use client';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Eye, EyeOff } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import toast from 'react-hot-toast';
import Input from '@/components/forms/Input';
import Link from 'next/link';
import { Button } from '@/components/Button';

type FormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  picture?: string | null;
};

const MIN_PASSWORD_LENGTH = 6;

function Register() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState, watch } = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', picture: null },
  });
  const password = watch('password');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || ""; 

  const onSubmit = async (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const fullName = data.name.trim();
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const payload: {
        name: string;
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        picture?: string;
      } = {
        name: fullName,
        firstName,
        lastName,
        email: data.email,
        password: data.password,
      };

      if (typeof data.picture === 'string' && data.picture.trim().length > 0) {
        payload.picture = data.picture.trim();
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);      
      if (!res.ok) {
        const errorMessage = json?.errors?.[0] || json?.message || 'Registration failed';
        toast.error(errorMessage);
        return;
      }
      toast.success('Registration successful! Please log in.');
      router.replace('/login?email=' + encodeURIComponent(data.email));

    } catch (err) {
      console.error(err);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false); 
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    const result = zxcvbn(password);
    return result.score;
  };

  const passwordStrength = getPasswordStrength(password);

  const strengthColor =
    passwordStrength === 0
      ? ''
      : passwordStrength <= 1
      ? 'bg-red-500'
      : passwordStrength <= 2
      ? 'bg-yellow-500'
      : 'bg-green-500';

  const strengthText =
    passwordStrength === 0
      ? ''
      : passwordStrength <= 1
      ? 'Weak'
      : passwordStrength <= 2
      ? 'Fair'
      : 'Strong';

  // set the initial email once send from home page
  useEffect(() => {
    setValue('email', emailFromUrl);
  }, [emailFromUrl, setValue]);

  return (
    <div className="w-full px-4">
      <div className="relative max-w-[500px] mx-auto">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6">
          {/* Heading */}
          <h3 className="text-lg font-medium text-[#020817] text-center mb-2">
            Create your account
          </h3>
          <p className="text-xs text-[#64748B] text-center mb-6">
            Sign up with your Social Media Accounts
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
            <div className="flex-1 justify-center">
              <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
                <GoogleSignInButton />
              </GoogleOAuthProvider>
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
            {/* Name Input */}
            <div className="mb-3">
              <Input
                type="text"
                placeholder="Full name"
                {...register('name', { required: 'Name is required' })}
                className="w-full h-[38px] px-3 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.name.message}</p>
              )}
            </div>

            {/* Email Input */}
            <div className="mb-3">
              <Input
                type="email"
                placeholder="name@example.com"
                {...register('email', { required: 'Email is required' })}
                className="w-full h-[38px] px-3 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-3">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: MIN_PASSWORD_LENGTH, message: `At least ${MIN_PASSWORD_LENGTH} characters` },
                  })}
                  className="w-full h-[38px] px-3 pr-10 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.password.message}</p>
              )}
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(passwordStrength + 1) * 20}%` }}
                    ></div>
                  </div>
                  {strengthText && (
                    <span className="text-xs text-gray-600 font-medium">{strengthText}</span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="mb-3">
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  {...register('confirmPassword', { required: 'Please confirm your password' })}
                  className="w-full h-[38px] px-3 pr-10 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {formState.errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={formState.isSubmitting || isLoading}
              className="w-full"
              label={formState.isSubmitting || isLoading ? 'Creating account...' : 'Create account'}
            />

            {/* Sign In Link */}
            <p className="text-xs text-center mt-4 font-poppins">
              <span className="text-[#64748B]">Already have an account? </span>
              <Link href="/login" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Terms and Privacy */}
      <p className="text-xs text-center mt-4 font-poppins leading-4">
        <span className="text-[#64748B]">By clicking Create account, you agree to the </span>
        <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link>
        <span className="text-[#64748B]"> and </span>
        <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Notice</Link>
      </p>
    </div>
  );
}

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Register />
    </Suspense>
  );
}
