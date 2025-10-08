"use client";
import React, { Fragment, useEffect, useState } from "react";
import { LoaderPinwheel, Download, X, } from "lucide-react";

import DocumentEditor from "@/components/builder/DocumentEditor";
import { DocumentField, Recipient, ROLES } from "@/types/types";
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
  const [recipientRole, setRecipientRole] = useState<'signer' | 'viewer' | 'approver' | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected' | null>(null);

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

  const handleSignOrApprove = async (action: 'signed' | 'approved' | 'rejected') => {
    try {
      const recipientId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("recipient")
          : null;

      await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId, action }),
      });

      if (action === 'signed') {
        setSigned(true);
      } else {
        setApprovalStatus(action);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} document`);
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
       { doc?.recipients.map((recipient) => {
            const roleDef = ROLES.find(r => r.value === recipient.role);
            const Icon = roleDef?.icon;
           
            let isNotSigner = doc.fields.filter(item => item.recipientId == recipient.id)

        return(
          <Fragment key={recipient.id}>
             {recipient.role === 'signer' && !signed && (
              <div>
              <small className="flex justify-center">{recipient.totalFields} Fields assigned</small>
                <button
                  onClick={() => handleSignOrApprove('signed')}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded hover:opacity-80 text-xs"
                  style={{backgroundColor: recipient.color}}
                >
                {Icon && <Icon size={12} />}
                Sign Document
              </button>
               {signed && <p className="text-green-600 font-medium">You have signed this document.</p>}
               </div>
            )}
            {recipient.role === 'approver' && isNotSigner.length && !approvalStatus && (
            <div className="flex gap-4 items-center">
              <small className="flex justify-center">{recipient.totalFields} Fields assigned</small>
              <button
                onClick={() => handleSignOrApprove('approved')}
                className="flex items-center gap-2 text-white px-4 py-2 rounded hover:opacity-80 text-xs"
                style={{backgroundColor: recipient.color}}
                >
                {Icon && <Icon size={12} />} 
                Approve Document
              </button>
              <button
                  onClick={() => handleSignOrApprove('rejected')}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                >
                <X size={12} /> Reject
              </button>
              {approvalStatus === 'approved' && <p className="text-green-600 font-medium">You have approved this document.</p>}
              {approvalStatus === 'rejected' && <p className="text-red-600 font-medium">You have rejected this document.</p>}
            </div>
            )}
            {recipient.role === 'viewer' && (
                <p className="text-gray-600 font-medium">You are a viewer for this document.</p>
              )}
           </Fragment>
      )})
      }
    </div>
  );
};

export default SignPageClient;



