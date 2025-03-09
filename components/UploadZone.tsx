'use client';
import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';


interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {


  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
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
  }, [onFileSelect]);

  return (
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors relative"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
          }}
        >
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.txt"
          />
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-blue-100 rounded-lg blur-sm"></div>
                <Upload className="w-16 h-16 text-blue-600 relative" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900">
                Drag and drop or Upload
              </h3>
              <p className="text-gray-500 max-w-sm">
                Document to send for signature or sign yourself
              </p>
              <div className="flex gap-4 mt-4">
                <label
                  htmlFor="fileInput"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
                >
                  Choose file
                </label>
              </div>
            </div>
        </div>
  
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Don&apos;t have a document ready?
          </p>
          <button
            onClick={handleSampleContract}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Try a sample contract
          </button>
        </div>
      </div>
  );
}
