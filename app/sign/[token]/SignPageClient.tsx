"use client";
import React, { useEffect, useRef, useState } from "react";
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
    status:string;
  };
}

const SignPageClient: React.FC<SignPageClientProps> = ({ token }) => {
  const [doc, setDoc] = useState<SignDocumentResponse["document"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [approvalStatus, setApprovalStatus] = useState<Recipient["status"] | null>(null);
  const [currentRecipient, setCurrentRecipient] = useState<Recipient | null>(null);
  const [currentRecipientId, setCurrentRecipientId] = useState<string>();
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const recipientId = new URLSearchParams(window.location.search).get("recipient");
        setCurrentRecipientId(recipientId ?? undefined);
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
        const recipient = data.document.recipients.find(r => r.id === recipientId);
        
        if (recipient) {
          setCurrentRecipient(recipient);
          const hasSigned = recipient.status === 'signed';
          const hasApproved = recipient.status === 'approved';

          setSigned(hasSigned || hasApproved);

          if (recipient.role === 'approver') {
            if (hasApproved || recipient.status === 'rejected') {
              setApprovalStatus(recipient.status);
            }
          }
        }
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

  const handleSignOrApprove = async (action: Recipient["status"]) => {
    try {
      const recipientId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("recipient")
          : null;

      const response = await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} document`);
      }

      if (action === 'signed' || action === 'approved') {
        setSigned(true);
      }
      if (action === 'approved' || action === 'rejected') {
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
            signingToken={token}
            onSignedSaveDocument={(fn) => (saveRef.current = fn)}
            currentRecipientId={currentRecipientId}
          />
        )}
      </div>

      {doc && currentRecipient && (() => {
        const roleDef = ROLES.find(r => r.value === currentRecipient.role);
        const Icon = roleDef?.icon;
        const assignedFields = doc.fields.filter(item => item.recipientId === currentRecipient.id);

        if (currentRecipient.role === 'signer') {
          if (signed) {
            return <p className="mt-4 text-green-600 font-medium">You have signed this document.</p>;
          }
          return (
            <div className="mt-4 text-center">
              <small>{assignedFields.length} Fields assigned</small>
              <button
                onClick={async () => {
                  if (saveRef.current) {
                    await saveRef.current();
                  }
                  handleSignOrApprove('signed');
                }}
                className="flex items-center gap-2 text-white px-4 py-2 rounded hover:opacity-80 text-xs mt-2"
                style={{ backgroundColor: currentRecipient.color }}
              >
              {Icon && <Icon size={12} />}
              Sign Document
            </button>
          </div>
        );
        }

        if (currentRecipient.role === 'approver') {
          if (approvalStatus === 'approved') {
            return <p className="mt-4 text-green-600 font-medium">You have approved this document.</p>;
          }
          if (approvalStatus === 'rejected') {
            return <p className="mt-4 text-red-600 font-medium">You have rejected this document.</p>;
          }
          return (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex gap-4">
                <button
                  onClick={() => handleSignOrApprove('approved')}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded hover:opacity-80 text-xs"
                  style={{backgroundColor: currentRecipient.color}}
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
              </div>
            </div>
          );
        }

        if (currentRecipient.role === 'viewer') {
          return <p className="mt-4 text-gray-600 font-medium">You are a viewer for this document.</p>;
        }

        return null;
      })()}
    </div>
  );
};

export default SignPageClient;
