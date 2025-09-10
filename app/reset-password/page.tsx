'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ResetPassword from '@/components/ResetPassword';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const email = searchParams.get('email');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ResetPassword token={token} email={email} />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}