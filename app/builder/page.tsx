import { redirect } from 'next/navigation';

export default function BuilderIndex() {
  // Redirect immediately to dashboard
  redirect('/dashboard');

  // This will never render
  return null;
}
