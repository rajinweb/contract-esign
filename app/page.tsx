'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import UploadZone from '@/components/UploadZone';
import useContextStore from '@/hooks/useContextStore';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { setSelectedFile } = useContextStore();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    router.push('/builder');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-12 mb-16 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Secure Digital Signatures for Your Business
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Transform your document signing process with legally valid digital
            signatures. Fast, secure, and compliant.
          </p>
          <div className="mt-8 flex space-x-4">
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600">
              Watch Demo
            </button>
          </div>
        </div>
        <div className="relative">
          <Image
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80"
            alt="Digital Signature Platform"
            className="rounded-lg shadow-xl w-full h-full"
            width={100}
            height={100}
          />
        </div>
      </div>
     
        <UploadZone onFileSelect={handleFileSelect} />

    </main>
  );
}
