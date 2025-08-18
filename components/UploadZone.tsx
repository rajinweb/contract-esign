'use client';
import React, { useCallback, useState } from 'react';
import { createPortal } from "react-dom";
import { LoaderPinwheel  } from 'lucide-react';
import Image from 'next/image';
import { PDFDocument } from 'pdf-lib';

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


  const handleSampleContract = async () => {
    // Create a new PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([890, 842]); // A4 size
  
    // const form = pdfDoc.getForm();
  
    // // Add a text field
    // const nameField = form.createTextField("customerName");
    // nameField.setText("Enter Customer Name");
    // nameField.addToPage(page, { x: 50, y: 700, width: 300, height: 30 });
  
    // const dateField = form.createTextField("date");
    // dateField.setText("Enter Date");
    // dateField.addToPage(page, { x: 50, y: 650, width: 300, height: 30 });
  
     // Serialize PDF
     const pdfBytes = await pdfDoc.save();
  
    // Create a File object (so your UploadZone flow works)
    const file = new File([pdfBytes], "sample-contract.pdf", {
      type: "application/pdf",
    });
  
    onFileSelect(file);
  };

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
              <h2 className="text-2xl font-semibold text-gray-800">Create and Sign my own document</h2>
              <p className="text-gray-600 mt-2">Add your eSignature to a document in a few clicks.</p>
              <span className="font-medium inline-block mt-4 py-2 rounded text-blue-500 flex gap-2 cursor-pointer hover:underline"
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
