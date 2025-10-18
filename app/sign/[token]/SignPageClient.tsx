"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
    status: string;
  };
}

interface RecipientFieldMetrics {
  assignedCount: number;
  filledCount: number;
  pendingRequiredCount: number;
}

const EMPTY_METRICS: RecipientFieldMetrics = {
  assignedCount: 0,
  filledCount: 0,
  pendingRequiredCount: 0,
};

const SignPageClient: React.FC<SignPageClientProps> = ({ token }) => {
  const [doc, setDoc] = useState<SignDocumentResponse["document"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [approvalStatus, setApprovalStatus] = useState<Recipient["status"] | null>(null);
  const [currentRecipient, setCurrentRecipient] = useState<Recipient | null>(null);
  const [currentRecipientId, setCurrentRecipientId] = useState<string>();
  const [recipientMetrics, setRecipientMetrics] = useState<RecipientFieldMetrics>(EMPTY_METRICS);
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const lastFieldsRef = useRef<string>('');

  const deriveRecipientState = useCallback(
    (fields: DocumentField[], recipient: Recipient | null | undefined) => {
      if (!recipient) {
        return {
          normalizedRecipient: null,
          metrics: EMPTY_METRICS,
          isSignedLike: false,
        };
      }

      const assigned = fields.filter((field) => field.recipientId === recipient.id);
      const pendingRequiredCount = assigned.filter(
        (field) => field.required !== false && (!field.value || field.value.trim() === "")
      ).length;
      const filledCount = assigned.length - pendingRequiredCount;

      const normalizedRecipient =
        pendingRequiredCount > 0 && recipient.status === "signed"
          ? { ...recipient, status: "pending" as Recipient["status"] }
          : recipient;

      const isSignedLike =
        normalizedRecipient.status === "signed" || normalizedRecipient.status === "approved";

      return {
        normalizedRecipient,
        metrics: {
          assignedCount: assigned.length,
          filledCount,
          pendingRequiredCount,
        },
        isSignedLike,
      };
    },
    []
  );

  const handleSignOrApprove = useCallback(async (action: Recipient["status"]) => {
    try {
      const recipientId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("recipient")
          : null;

      console.log('Calling signedDocument API with:', { token, recipientId, action });

      const response = await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId, action }),
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response data:', result);

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${action} document`);
      }

      if (action === 'signed' || action === 'approved') {
        setIsSigned(true);
        // Update current recipient status in local state
        setCurrentRecipient(prev => prev ? { ...prev, status: action } : null);
      }
      if (action === 'approved' || action === 'rejected') {
        setApprovalStatus(action);
      }
    } catch (err) {
      console.error('Error in handleSignOrApprove:', err);
      alert(`Failed to ${action} document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [token]);

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
        const recipient = data.document.recipients.find((r) => r.id === recipientId);

        if (recipient) {
          const { normalizedRecipient, metrics, isSignedLike } = deriveRecipientState(
            data.document.fields,
            recipient
          );

          setCurrentRecipient(normalizedRecipient);
          setRecipientMetrics(metrics);
          setIsSigned(isSignedLike);

          if (normalizedRecipient?.role === "approver") {
            if (normalizedRecipient.status === "approved" || normalizedRecipient.status === "rejected") {
              setApprovalStatus(normalizedRecipient.status);
            } else {
              setApprovalStatus(null);
            }
          } else {
            setApprovalStatus(null);
          }
        } else {
          setCurrentRecipient(null);
          setRecipientMetrics(EMPTY_METRICS);
          setIsSigned(false);
          setApprovalStatus(null);
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
  }, [token, deriveRecipientState]);

  useEffect(() => {
    if (!doc || !currentRecipientId) {
      setRecipientMetrics(EMPTY_METRICS);
      if (currentRecipient) {
        setCurrentRecipient(null);
      }
      setApprovalStatus(null);
      return;
    }

    const latestRecipient =
      doc.recipients.find((r) => r.id === currentRecipientId) ?? currentRecipient;

    const { normalizedRecipient, metrics } = deriveRecipientState(
      doc.fields,
      latestRecipient
    );

    setRecipientMetrics(metrics);

    if (normalizedRecipient) {
      if (
        !currentRecipient ||
        currentRecipient.id !== normalizedRecipient.id ||
        currentRecipient.status !== normalizedRecipient.status
      ) {
        setCurrentRecipient(normalizedRecipient);
      }

      if (normalizedRecipient.role === "approver") {
        if (normalizedRecipient.status === "approved" || normalizedRecipient.status === "rejected") {
          setApprovalStatus(normalizedRecipient.status);
        } else {
          setApprovalStatus(null);
        }
      } else {
        setApprovalStatus(null);
      }
    } else {
      if (currentRecipient) {
        setCurrentRecipient(null);
      }
      setApprovalStatus(null);
    }
  }, [doc, currentRecipientId, currentRecipient, deriveRecipientState]);

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
        Hi, {currentRecipient?.name ?? 'Unknown Recipient'}
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
            isSigned={isSigned}
            onPageChange={setPage}
            onNumPagesChange={setNumPages}
            signingToken={token}
            onSignedSaveDocument={(fn) => (saveRef.current = fn)}
            currentRecipientId={currentRecipientId}
            onFieldsChange={(fields: DocumentField[]) => {
              // Prevent infinite loop by checking if fields actually changed
              const fieldsStr = JSON.stringify(fields);
              if (lastFieldsRef.current !== fieldsStr) {
                lastFieldsRef.current = fieldsStr;
                setDoc(prev => prev ? { ...prev, fields } : null);
              }
            }}
          />
        )}
      </div>

      {doc && currentRecipient && (() => {
        const roleDef = ROLES.find(r => r.value === currentRecipient.role);
        const Icon = roleDef?.icon;
        const { assignedCount, filledCount, pendingRequiredCount } = recipientMetrics;
        const allRequiredFieldsFilled = pendingRequiredCount === 0;

        if (currentRecipient.role === 'signer') {
          // If already signed, show completion message
          if (isSigned) {
            return (
              <div className="mt-4 text-center">
                <p className="text-green-600 font-medium">✓ You have signed this document.</p>
                <small className="text-gray-500">
                  {filledCount} of {assignedCount} fields completed
                </small>
              </div>
            );
          }

          // Not signed yet - show progress and button
          return (
            <div className="mt-4 text-center">
              <small className="block text-gray-600 mb-1">
                {filledCount} of {assignedCount} fields completed
              </small>
              {!allRequiredFieldsFilled && (
                <p className="text-amber-600 text-xs mt-2">
                  {pendingRequiredCount} required field{pendingRequiredCount > 1 ? 's' : ''} remaining
                </p>
              )}
              <button
                onClick={async () => {
                  if (!allRequiredFieldsFilled) return; // Safety check
                  
                  try {
                    // Save fields first
                    if (saveRef.current) {
                      console.log('Saving fields...');
                      await saveRef.current();
                      console.log('Fields saved successfully');
                    }
                    
                    // Small delay to ensure DB save completes
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Then mark as signed (this must come after field save)
                    console.log('Marking as signed...');
                    await handleSignOrApprove('signed');
                    console.log('Signed successfully');
                  } catch (error) {
                    console.error('Error during signing:', error);
                    alert('Failed to sign document. Please try again.');
                  }
                }}
                disabled={!allRequiredFieldsFilled}
                className="flex items-center gap-2 text-white px-4 py-2 rounded text-xs mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: currentRecipient.color }}
                title={!allRequiredFieldsFilled ? 'Please fill all required fields before signing' : 'Click to sign the document'}
              >
                {Icon && <Icon size={12} />}
                Sign Document
              </button>
            </div>
          );
        }

        if (currentRecipient.role === 'approver') {
          if (approvalStatus === 'approved') {
            return  <p className="text-green-600 font-medium">ThankYou</p>;
          }
          if (approvalStatus === 'rejected') {
            return <div className="mt-4 text-center">
              <p className="text-red-600 font-medium">You have rejected this document.</p>
            </div>;
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