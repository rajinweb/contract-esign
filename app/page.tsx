'use client';
import React from 'react';
import UploadZone from '@/components/UploadZone';
import Image from 'next/image';
import FreeTrialForm from '@/components/FreeTrialForm';
import useContextStore from '@/hooks/useContextStore';

export default function Home() {
  const {user} = useContextStore()

  return (
   <>
    <section className="bg-gradient">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8 pt-20">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-20">
            Secure <br/> Digital Signatures <br/> for Your Business
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Transform your document signing process with legally valid digital
            signatures. Fast, secure, and compliant.
          </p>
          {!user && (
            <div className="mt-8 flex space-x-4">       
            <FreeTrialForm/>
          </div>
          )}
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
    <UploadZone />
    </>
  );
}
