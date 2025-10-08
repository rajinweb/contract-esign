"use client";
import React, { useEffect, useState } from "react";
import { LoaderPinwheel, Download } from "lucide-react";
import Image from "next/image";

import DocumentEditor from "@/components/builder/DocumentEditor";
import { DocumentField, Recipient } from "@/types/types";
import { notFound } from "next/navigation";
import Brand from "@/components/Brand";

interface SignPageClientProps {
  token: string;
}

interface SignDocumentResponse {
  success: boolean;
  document: {
    id: string;
    fileUrl: string;
    name: string;
    fields: DocumentField[];
    recipients: Recipient[];
  };
}

const SignPageClient: React.FC<SignPageClientProps> = ({ token }) => {
  const [doc, setDoc] = useState<SignDocumentResponse["document"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const recipientId = new URLSearchParams(window.location.search).get("recipient");
        if (!recipientId) {
            setError("Recipient not specified.");
            setLoading(false);
            return;
        }
        const res = await fetch(`/api/sign-document?token=${encodeURIComponent(token)}&recipient=${recipientId}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Invalid or expired signing link.");

        const data: SignDocumentResponse = await res.json();
        if (!data.success || !data.document) notFound();

        setDoc(data.document);
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Failed to fetch document";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();
  }, [token]);

  const handleSign = async () => {
    try {
      const recipientId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("recipient")
          : null;

      await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId }),
      });
      setSigned(true);
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

  if (!token) return <div className="text-center mt-20 text-red-500">Invalid link</div>;

  return (
    <div className="flex flex-col items-center">
        <header className="w-full bg-white px-4 py-2 flex justify-between items-center">
        <Brand/>
        <div className="text-gray-600">
          Page {page} of {numPages}
        </div>
        <a
          href={doc?.fileUrl}
          download
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center text-xs"
        >
          <Download size={16} className="mr-2" />
          Download
        </a>
      </header>
      <div className="w-full">
        {doc && (
          <DocumentEditor
            documentId={doc.id}
            initialFileUrl={doc.fileUrl}
            initialDocumentName={doc.name}
            initialFields={doc.fields}
            initialRecipients={doc.recipients}
            isSigningMode={true}
            onPageChange={setPage}
            onNumPagesChange={setNumPages}
          />
        )}
      </div>
      {!signed ? (
        <button
          onClick={handleSign}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4 text-sm"
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



