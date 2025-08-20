import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  
 const cookieStore = await cookies();
 const token = cookieStore.get('token')?.value;

  if (!token) {
    console.log('No token found, redirecting to login');
    redirect('/login');
  }
 
  return <>{children}</>;
}
