'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import usePasswordToggle from '@/hooks/usePasswordToggle';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LockKeyhole } from 'lucide-react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';

import toast from 'react-hot-toast';


type FormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  picture?: string | null;
};

function Register() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState, watch } = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', picture: null },
  });
  const password = watch('password');
  
  const [isLoading, setIsLoading] = useState(false);
  const { isVisible, toggleVisibility } = usePasswordToggle();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || ""; 

  const onSubmit = async (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      toast('Passwords do not match');
      return;
    }
    try {
      const payload = { name: data.name, email: data.email, password: data.password, picture: data.picture };
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);      
      if (!res.ok) {
        toast.error(json?.message || 'Registration failed');
        return;
      }
      toast.success('Registration successful! Please log in.');
      router.replace('/login?email=' + encodeURIComponent(data.email));

    } catch (err) {

      console.error(err);
      toast('Network error');

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
    <div className="flex items-center justify-center py-16">
      <div className="px-8 py-6 text-left bg-white shadow-lg rounded-lg w-full max-w-md">
        <h3 className="text-2xl font-bold text-center mb-4">SIGN UP FOR FREE NOW!</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                formState.errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('name', { required: 'Name is required' })}
            />
            {formState.errors.name && <p className="text-red-500 text-sm mt-1">{formState.errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                formState.errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('email', { required: 'Email is required' })}
            />
            {formState.errors.email && <p className="text-red-500 text-sm mt-1">{formState.errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={isVisible ? 'text' : 'password'}
                className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none pr-10 ${
                  formState.errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 chars' } })}
              />
              <button
                type="button"
                onClick={toggleVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
              >
                {isVisible ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
            {formState.errors.password && <p className="text-red-500 text-sm mt-1">{formState.errors.password.message}</p>}
            <div className="mt-1 h-3 w-full flex items-center">
                <LockKeyhole size={12}/>
                <div className="ml-1 flex-1 bg-gray-100 rounded-full h-1/2 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-in-out ${strengthColor}`}
                    style={{ width: `${(passwordStrength + 1) * 20}%` }}
                  ></div>
                </div>
             {strengthText && (
                  <span className="text-sm ml-2 text-gray-700 font-medium">{strengthText}</span>
                )} 
            </div>
          
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="********"
              className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                formState.errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('confirmPassword', { required: 'Confirm Password is required' })}
            />
            {formState.errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{formState.errors.confirmPassword.message}</p>}
          </div>


          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 text-white font-semibold rounded-md transition-colors ${
              isLoading
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="my-3 text-center text-sm text-gray-600">
        <span className='text-2xl'>🎉 </span> No credit card required
        </div>

         <p className="mt-4 text-center text-gray-600 text-sm border-t pt-3">
         Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in.</a>
          </p>
           {/* Include the Google Sign-In button */}
          <div className="flex justify-center mt-4">
            <GoogleOAuthProvider clientId="475170635447-lrrlsb0coohf3dicefsges3keo386at5.apps.googleusercontent.com">
              <GoogleSignInButton />
            </GoogleOAuthProvider>
            {/* Add other social login buttons here */}
          </div>
      </div>
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
