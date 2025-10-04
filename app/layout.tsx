import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import LayoutWrapper from '@/components/LayoutWrapper';
import './globals.css';
import { Toaster } from "react-hot-toast";
export const metadata: Metadata = {
  title: 'Contract e-sign',
  description: 'Contract e-sign app',
  icons: {
    icon: '/favicon.ico',
  },
};
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['200', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable}`}>
        <main className='flex flex-col h-screen'>
          <LayoutWrapper>{children}</LayoutWrapper>
        </main>
         {/* Global toaster here */}
         <Toaster
          position="top-center"
          toastOptions={{
            className: "rounded-2xl shadow-lg mt-24",
            style: {
              background: "#fff",
              color: "#333",
            },
            success: {
              style: { background: "#10B981", color: "white" }, 
            },
            error: {
              style: { background: "#EF4444", color: "white" },  
            },
          }}
        />
      </body>
    </html>
  );
}
