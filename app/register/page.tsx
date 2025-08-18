'use client';

import GoogleSignInButton from '@/components/GoogleSignInButton';
import usePasswordToggle from '@/utils/usePasswordToggle';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';
import { useSearchParams } from "next/navigation";
export default function Register() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isVisible, toggleVisibility } = usePasswordToggle();
  const [errors, setErrors] = useState({
    passwordStrength: '',
    email: '',
    password: '',
  });
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || ""; // now always string ✅
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required';

    if (!password.trim()) {
        newErrors.password = 'Password is required';
     } else {
      const strength = zxcvbn(password);
        if (strength.score < 3) {
        newErrors.password = 'Password is too weak.';
              }
    }

    setErrors({ ...errors,  password: newErrors.password || '' });

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(data.message || 'Registration successful!');
          setEmail('');
          setPassword('');
        } else {
          setMessage(data.message || 'Registration failed.');
        }
      } catch (error) {
        console.error('Registration error:', error);
        setMessage('An error occurred during registration.');
      } finally {
        setIsLoading(false);
      }
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
      ? 'bg-white'
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

    // set the initial email once on load
    useEffect(() => {
      setEmail(emailFromUrl);
    }, [emailFromUrl]);
    
  return (
    <div className="flex items-center justify-center py-16">
      <div className="px-8 py-6 text-left bg-white shadow-lg rounded-lg w-full max-w-md">
        <h3 className="text-2xl font-bold text-center">SIGN UP FOR FREE NOW!</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              value={email}       
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={toggleVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
              >
                {isVisible ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            <div className="mt-2 h-3 w-full flex items-center">
                <LockKeyhole size={16} />
                <div
                  className={`ml-4 h-1 rounded-full transition-all duration-500 ease-in-out ${strengthColor}`}
                  style={{ width: `${(passwordStrength + 1) * 20}%` }}
                ></div>
             {strengthText && (
                  <span className="text-sm ml-2 text-gray-700">{strengthText}</span>
                )} 
            </div>
          
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
        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">
            {message}
          </p>
        )}
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
