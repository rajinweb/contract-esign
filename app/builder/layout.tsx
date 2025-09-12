'use client'
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';

export default function BuilderLayout({ children }: { children: ReactNode }) {
  const {selectedFile, setIsLoggedIn } = useContextStore();
  const router=useRouter();
  useEffect(()=>{
    if (!selectedFile) {
      console.log('Redirecting to home page');
      router.replace('/dashboard');
    }else {
      setIsLoggedIn(false);
    }
  },[selectedFile, router])
  return <>{children}</>;
}
