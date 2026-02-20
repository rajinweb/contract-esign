'use client'
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link'
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';
import UserDropdown from './UserDropdown';
import Brand from './Brand';


export function Header() {
  const { isLoggedIn, selectedFile, setShowModal } = useContextStore();
  const router= useRouter();
  const initialScrolled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const denominator = document.body.scrollHeight - window.innerHeight;
    if (denominator <= 0) {
      return false;
    }
    return (window.scrollY / denominator) * 100 > 10;
  }, []);
  const [scrolled, setScrolled] = useState(initialScrolled);

  useEffect(() => {
    const handleScroll = () => {
      const denominator = document.body.scrollHeight - window.innerHeight;
      if (denominator <= 0) {
        setScrolled(false);
        return;
      }
      const scrollPercentage = (window.scrollY / denominator) * 100;
      setScrolled(scrollPercentage > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <header className={`fixed w-full top-0 z-10 transition-colors duration-300 ${scrolled ? 'bg-white shadow-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Brand/>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600">Solutions</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Products</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Resources</Link>
          </nav>
          <div className="flex space-x-4">
            {isLoggedIn ? (
                <UserDropdown />
              ) : (
                <>
                <button
                  className="text-blue-600"
                  // You can trigger your login modal here
                  onClick={() =>{
                    if(!selectedFile){
                      router.push('/login')
                     }else{
                      setShowModal(true)
                     }
                  }}
                >
                  Login
                </button>
                <Link href="/register" className="px-4 py-2  bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  Get Started
                </Link>
                
                <Link
                  href="/contact"
                  className="bg-white flex justify-end p-0.5 relative rounded-full shadow-md w-[132px] group transition-all"
                >
                  <span className="absolute left-0 py-1.5 px-2 text-sm z-10">Book a Demo</span>

                  <div className="bg-blue-100 flex h-full items-center justify-end px-2 rounded-full w-8  transition-all duration-300 group-hover:w-full">
                    <ArrowRight size={16} className='rotate-[-45deg] group-hover:rotate-[0deg]' />
                  </div>
                </Link>
                </>
              )}
          </div>
        </div>
      </div>
    </header>
  );
}
