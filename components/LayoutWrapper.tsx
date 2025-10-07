'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import ContextProvider from '@/components/ContextProvider';
import React, { useEffect, useState } from 'react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only decide to show header/footer after client mount to avoid hydration mismatch
  const hideHeaderFooter = mounted && pathname && (pathname.startsWith('/builder') || pathname.startsWith('/dashboard') ||  pathname.startsWith('/sign'));

  return (
    <ContextProvider>
      {mounted && !hideHeaderFooter && <Header />}
      {children}
      {mounted && !hideHeaderFooter && <Footer />}
    </ContextProvider>
  );
}
