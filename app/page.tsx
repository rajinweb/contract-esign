'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import UploadZone from '@/components/UploadZone';
import Image from 'next/image';
import useContextStore from '@/hooks/useContextStore';
import FreeTrialForm from '@/components/FreeTrialForm';

export default function Home() {
  const { setSelectedFile } = useContextStore();
  const router = useRouter();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    router.push('/builder');
  };

  return (
   <>
    <section className="bg-gradient">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8 py-20">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-20">
            Secure <br/> Digital Signatures <br/> for Your Business
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Transform your document signing process with legally valid digital
            signatures. Fast, secure, and compliant.
          </p>
          <div className="mt-8 flex space-x-4">
            {/* <button
              onClick={() => router.push('/register')}
              className='px-8 py-3 bg-orange-400 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-orange-500 transition duration-300'
            >
              Request a signature
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600">
              Watch Demo
            </button> */}
            <FreeTrialForm/>
          </div>
          {/* <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-500 text-sm">
              <div className="flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-1 text-orange-500" />
                  eIDAS compliant
              </div>
              <div className="flex items-center">
                  <LockKeyhole className="w-5 h-5 mr-1 text-orange-500" />
                  End-to-end encryption
              </div>
          </div> */}
        </div>
        <div className="flex justify-end relative">
          <div className='absolute w-20 text-center top-[90px] right-[70px]'>
            <Image
              src="/images/aadhaar-logo.svg"
              alt="Digital e-signature Platform"
              className="w-full"
              width={300}
              height={193}
              quality={100}
            />
            <span className='relative text-sm font-semibold text-blue-900 bottom-1'>verified</span>
          </div>
         <Image
            src="/images/securesign.png"
            alt="Digital e-signature Platform"
            width={512}
            height={512}
            quality={100}
          />
        </div>
      </div>
    </section>
    <UploadZone onFileSelect={handleFileSelect} />
    </>
  );
}
