'use client'
import React from 'react';
import { ArrowRight, FileSignature } from 'lucide-react';
import Link from 'next/link'
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';
import UserDropdown from './UserDropdown';
import { useEffect, useState } from 'react';


export function Header() {
  const { isLoggedIn, setIsLoggedIn, setSelectedFile, selectedFile, setShowModal } = useContextStore();
  const router= useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <header className={`fixed w-full top-0 z-10 transition-colors duration-300 ${scrolled ? 'bg-white shadow-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <FileSignature className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SecureSign</span> 
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600">Solutions</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Products</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Pricing</Link>
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
                  className="bg-white flex justify-end p-0.5 relative rounded-full shadow-md w-[132] group transition-all"
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