'use client';
import React, { useState } from 'react';
import GoogleSignInButton from '@/components/GoogleSignInButton'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import usePasswordToggle from '@/utils/usePasswordToggle';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginPage: React.FC = () => {
  const { isVisible, toggleVisibility } = usePasswordToggle();
  const {setShowModal, setIsLoggedIn} = useContextStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
 
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form is valid. Submitting:', { email, password });
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
       if (response.ok) {
          localStorage.setItem('AccessToken', data.token);
          router.push('/builder');
          setIsLoggedIn(true);
          setShowModal(false)
        } else {
          // Handle error (show message to user)
          alert(data.message || 'Login failed');
        }
        // Handle the API response (e.g., redirect on success, display error on failure)
      } catch (error) {
        console.error('Error during login:', error);
      }
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="px-8 py-6 text-left bg-white shadow-lg rounded-lg w-full max-w-md">
        <h3 className="text-2xl font-bold text-center">Login to SecureSign</h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="email">Email</label>
              <input type="email" placeholder="Email"
                className={`w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 ${emailError ? 'border-red-500 focus:ring-red-600' : 'focus:ring-blue-600'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <div className="mt-4">
              <label className="block mb-2" htmlFor="password">Password</label>
              <div className="relative flex items-center">
                <input type={isVisible ? 'text' : 'password'} placeholder="Password"
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-1 ${passwordError ? 'border-red-500 focus:ring-red-600' : 'focus:ring-blue-600'}`}
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
              {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>
        
              <button type="submit" className="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-900">Login</button>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</a>
          
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
        
          <p className="relative after:content-[''] my-4 text-sm after:border-b after:block after:absolute after:w-full after:-mt-[10px] after:z-2">
            <span className='bg-white relative z-20 '>or sign up with</span>
          </p>
       
          {/* Include the Google Sign-In button */}
          <div className="flex justify-center mt-4">
            <GoogleOAuthProvider clientId="475170635447-lrrlsb0coohf3dicefsges3keo386at5.apps.googleusercontent.com">
              <GoogleSignInButton />
            </GoogleOAuthProvider>
            {/* Add other social login buttons here */}
          </div>
          <p className="mt-4 text-center text-gray-600 text-sm">
            Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline">Register here.</a>
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;