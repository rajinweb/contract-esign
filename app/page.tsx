'use client';
import React from 'react';
import UploadZone from '@/components/UploadZone';
import Image from 'next/image';
import FreeTrialForm from '@/components/FreeTrialForm';
import useContextStore from '@/hooks/useContextStore';
import ChooseATemplate from '@/components/ChooseTemplate';
import { Gavel, Shield, UserCheck, WandSparkles } from 'lucide-react';
import Carousel from '@/components/Carousel';

export default function Home() {
  const {user} = useContextStore()

  return (
   <>
    <section className="bg-gradient">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8 pt-20 bg-[url('/images/aadhaar-logo-bg.png')] bg-no-repeat bg-bottom">
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
    <ChooseATemplate/>
    <Carousel/>
    <section className="flex flex-col items-center mt-24 mb-8">
     <div className="flex flex-col gap-8 lg:flex-row lg:gap-16">          
          <Image src={'/images/adhaar-approved.png'} alt={'Adhaar Authentication'} width={329} height={264} quality={100}/>          
          <div className="flex-1 max-w-[600px]">
            <h1 className="text-3xl font-medium text-black leading-[28.8px] mb-4"> What is Aadhaar Based eSignature </h1>
            <p className='my-6'>
              Aadhaar-based eSign is a safe and paperless method to digitally sign documents using your Aadhaar ID. With biometric authentication, it enables quick and legally valid signatures. DocYouSign provides users with a seamless digital signing experience in just a few clicks.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FeatureBox icon={ <Shield />}  title="Secure & Fast"  />
              <FeatureBox icon={<WandSparkles />}  title="Paperless Signing" />
              <FeatureBox icon={<Gavel />}  title="Legally Valid" />
              <FeatureBox icon={<UserCheck />} title="Easy Authentication" 
              />
            </div>
          </div>
        </div>
        </section>
    </>
  );
}

function FeatureBox({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-4 rounded-xl bg-[#EEF5FF] text-blue-500">
          {icon} 
      </div>
      <h5 className="text-[#185cb7]">{title}</h5>
    </div>
  );
}

