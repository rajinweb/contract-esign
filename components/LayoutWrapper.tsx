'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import ContextProvider from '@/components/ContextProvider';
import React from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import AuthStateBridge from '@/components/auth/AuthStateBridge';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeaderFooter =
    pathname != null &&
    (pathname.startsWith('/builder') || pathname.startsWith('/dashboard') || pathname.startsWith('/sign'));

  return (
    <main className={`h-screen ${hideHeaderFooter ? 'flex' : ''}`}>
      <ContextProvider>
        <AuthProvider>
          <AuthStateBridge />
          {!hideHeaderFooter && <Header />}
          {children}
          {!hideHeaderFooter && <Footer />}
        </AuthProvider>
      </ContextProvider>
    </main>
  );
}
