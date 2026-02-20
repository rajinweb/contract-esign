'use client';

import { Button } from '@/components/Button';
import Input from '@/components/forms/Input';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Reset link sent to your email');
        setSubmitted(true);
      } else {
        toast.error(data.error || 'An error occurred');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4">
      <div className="relative max-w-[500px] mx-auto">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6">
          {/* Heading */}
          <h3 className="text-lg font-medium text-[#020817] text-center mb-2">
            Reset your password
          </h3>
          <p className="text-xs text-[#64748B] text-center mb-6">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>

          {submitted ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 mb-2">Check your email for reset instructions</p>
              <p className="text-xs text-[#64748B] mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
              <Link
                href="/login"
                className="text-blue-500 hover:underline text-sm font-medium"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="mb-4">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="w-full h-[38px] px-3 rounded-md border border-[#E2E8F0] text-sm font-poppins placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full"
                label={isSubmitting ? 'Sending reset link...' : 'Send reset link'}
                
              />
               

              {/* Back to Login */}
              <p className="text-xs text-center mt-4 font-poppins">
                <span className="text-[#64748B]">Remember your password? </span>
                <Link href="/login" className="text-blue-500 hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
