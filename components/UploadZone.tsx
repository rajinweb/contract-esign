'use client';
import React, { useCallback, useState } from 'react';
import { LoaderPinwheel  } from 'lucide-react';
import Image from 'next/image';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {

  const [isLoading, setIsLoading] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsLoading(true);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
   
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      setIsLoading(true);
    },
    [onFileSelect]

  );

  const handleSampleContract = useCallback(() => {
    // Create a sample contract file
    const sampleContent = `Sample Contract

Customer Name: _____________________ Date: _____________________

This is a sample contract for demonstration purposes.

1. Terms and Conditions
   - This is a sample term
   - This is another sample term

2. Agreement
   The undersigned parties agree to the terms stated above.

Signature: _____________________
Date: _____________________`;

    const file = new File([sampleContent], 'sample-contract.txt', {
      type: 'text/plain',
    });
    onFileSelect(file);
    setIsLoading(true); // Set loading for sample contract as well
  }, [onFileSelect]);

  return (
    <section 
          className="flex gap-10 items-center justify-center max-w-7xl min-h-[300] mx-auto p-10"
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
          {isLoading ? (
            <div>
              <LoaderPinwheel size={30} className="animate-spin text-blue-600  m-auto" />
              Processing...
            </div>
          ):(
          <>
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.txt"
          />
          <label htmlFor="fileInput" className="grid grid-cols-2 items-center gap-6 bg-[#ecf1f7] p-6 rounded-lg">
              <div className="h-full">
                <h2 className="text-2xl font-semibold text-gray-800">Send my document for signature</h2>
                <p className="text-gray-600 mt-2">Get your document eSigned by multiple recipients.</p>
                <span className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => handleFileInput} >
                  Choose a document
                </span>                
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
          <div className="grid grid-cols-2 items-center gap-6 bg-[#f2f7ff]  rounded-lg">
            <div className="h-full p-6">
              <h2 className="text-2xl font-semibold text-gray-800">Sign my own document</h2>
              <p className="text-gray-600 mt-2">Add your eSignature to a document in a few clicks.</p>
              <span className="font-medium inline-block mt-4 py-2 rounded text-blue-500 flex gap-2 cursor-pointer hover:underline"
                  onClick={() => handleSampleContract} >
                Try a sample contract →
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

          </>
          )
        }
        </section>
  );
}
