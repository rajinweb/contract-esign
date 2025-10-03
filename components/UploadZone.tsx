'use client';
import React from 'react';
import { createPortal } from "react-dom";
import { LoaderPinwheel, Upload  } from 'lucide-react';
import Image from 'next/image';
import useDropZone from '@/hooks/useDropZone'
export default function UploadZone() {
  const {isLoading, handleDrop, handleSampleContract, handleFileInput}=useDropZone();
  if(isLoading){
    return createPortal(<div className="fixed inset-0 flex flex-col items-center justify-center bg-black/50 z-[9999]">
        <LoaderPinwheel
          size={40}
          className="animate-spin text-blue-600 mb-2"
        />
        <span className="text-white">Processing...</span>
      </div>,
      document.body as HTMLElement
    );
  }
  
  return (
    <section 
          className="flex gap-10 max-w-7xl mx-auto p-10"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          // onDragEnter={(e) => {
          //   e.preventDefault();
          //   e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
          // }}
          // onDragLeave={(e) => {
          //   e.preventDefault();
          //   e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
          // }}
        >
         
          <label className="grid grid-cols-2 items-center gap-6 bg-[#ecf1f7] p-6 rounded-lg">
              <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.doc,.docx,.txt" />
              <div className="h-full">
                <h2 className="text-2xl font-medium text-gray-800">Send my document for signature</h2>
                <p className="text-gray-600 mt-2">Get your document eSigned by multiple recipients.</p>
                <div className="w-full mt-4 primary-button cursor-pointer flex gap-2 items-center justify-center">
                    <Upload size={18}/> Choose a document            
                </div>                
              </div>
              <div className="h-full items-center flex justify-center pointer-events-none">
                <div>
                  <Image
                    src="/images/pdf-docs.svg"
                    alt="Send my document for signature"
                    width={200}
                    height={200}
                    className="m-auto"
                    quality={100}
                  />   
                  <p className="text-sm text-gray-500 w-44 text-center mt-1">or, drop the file here</p> 
                </div>       
              </div>
          </label>
    
          {/* Sign My Own Document Form */}
          <div className="grid grid-cols-2 items-center gap-6 bg-[#f2f7ff] rounded-lg">
            <div className="h-full p-6">
              <h2 className="text-2xl font-medium text-gray-800">Create and Sign my own document</h2>
              <p className="text-gray-600 mt-2">Add your eSignature to a document in a few clicks.</p>
              <span className="font-medium mt-4 py-2 rounded text-blue-500 flex gap-2 cursor-pointer hover:underline"
                  onClick={handleSampleContract} >
                Create a sample contract →
                </span>      
            </div>
                <div className="h-full items-center flex justify-end pointer-events-none">
                  <Image
                    src="/images/signIcon.png"
                    alt="Send my document for signature"
                    width={123}
                    height={123}
                    className="w-[78%]"
                    quality={100}
                  />   
               </div>
          </div>
    </section>
  );
}
