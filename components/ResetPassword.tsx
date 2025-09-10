'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Define the PasswordInputs type for the form
type PasswordInputs = {
  newPassword: string;
  confirmPassword: string;
};

// Define the Body type for the API request payload
interface ResetPasswordBody {
  newPassword: string;
  token?: string; // Optional, only included in reset flow
}

type ResetPasswordProps = {
  token?: string | null;
  email?: string | null;
};

const ResetPassword = ({ token, email }: ResetPasswordProps) => {
  const isResetFlow = !!token; // true if accessed via reset link with token
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInputs>();

  const onSubmit: SubmitHandler<PasswordInputs> = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const endpoint = isResetFlow
      ? '/api/user/reset-password' // reset via token (forgot password)
      : '/api/user/change-password'; // update while logged-in

    const body: ResetPasswordBody = { newPassword: data.newPassword };
    if (isResetFlow && token) {
      body.token = token;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isResetFlow ? 'Password reset successful' : 'Password updated');
        reset();
        if (isResetFlow) {
          const redirectUrl = `/login?email=${email ? encodeURIComponent(email) : ''}`;
          // Optionally redirect to login page after reset
          router.push(redirectUrl);
        }
      } else {
        const err = await res.json().catch(() => ({ message: 'Error' }));
        toast.error(err.message || 'Failed to update password');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4">
      <div className="text-sm text-gray-500 mb-2">
        {isResetFlow ? 'Reset Password' : 'Change Password'}
      </div>
      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-md border border-gray-100">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              {...register('newPassword', { required: true, minLength: 6 })}
              type="password"
              placeholder="New password"
              className="border px-3 py-2 rounded w-full"
            />
            <input
              {...register('confirmPassword', { required: true })}
              type="password"
              placeholder="Confirm password"
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          {errors.newPassword && (
            <div className="text-sm text-red-600 mt-2">
              Password must be at least 6 characters
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded w-52"
        >
          {isSubmitting
            ? 'Saving...'
            : isResetFlow
            ? 'Reset Password'
            : 'Update Password'}
        </button>
      </div>
    </form>
  );
};

export default ResetPassword;
