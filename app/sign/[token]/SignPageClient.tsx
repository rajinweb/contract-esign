"use client";
import React, { useEffect, useState } from "react";
import { LoaderPinwheel } from "lucide-react";

interface SignPageClientProps {
  token: string;
}

const SignPageClient: React.FC<SignPageClientProps> = ({ token }) => {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);    
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);

        
        const res = await fetch(`/api/getDocument?token=${token}`);
        
        if (!res.ok) throw new Error("Invalid or expired signing link");

        const blob = await res.blob();
        setPdfFile(blob);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch document");
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();
  }, [token]);

  const handleSign = async () => {
    try {
      // TODO: Call API to save signature
      await fetch("/api/signDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setSigned(true);
      alert("Document signed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to sign document");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full">
        <LoaderPinwheel className="animate-spin" size={40} color="#2563eb" />
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        {error}
      </div>
    );

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-3xl h-[80vh] border border-gray-300 shadow-md mb-4">
        {pdfFile && <SimplePDFViewer selectedFile={pdfFile as File} zoom={1} />}
      </div>

      {!signed ? (
        <button
          onClick={handleSign}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Sign Document
        </button>
      ) : (
        <p className="text-green-600 font-medium">You have signed this document.</p>
      )}
    </div>
  );
};

export default SignPageClient;



import { Document, Page, pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface SimplePDFViewerProps {
  selectedFile: string | File;
  zoom?: number;
}

export const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({ selectedFile, zoom = 1 }) => {
  const [numPages, setNumPages] = useState<number>(0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="w-full h-full overflow-auto flex justify-center items-start bg-gray-100">
      <Document
        file={selectedFile}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<p>Loading PDF...</p>}
        error={<p>Failed to load PDF</p>}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            scale={zoom}
            className="mb-4 shadow-md border border-gray-200"
          />
        ))}
      </Document>
    </div>
  );
};



