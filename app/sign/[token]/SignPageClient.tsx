"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LoaderPinwheel, Download, X, AlertCircle, Edit2Icon } from "lucide-react";

import DocumentEditor from "@/components/builder/DocumentEditor";
import { DocumentField, Recipient, ROLES } from "@/types/types";
import { notFound } from "next/navigation";
import Brand from "@/components/Brand";
import Modal from "@/components/Modal";
import Map from "@/components/Map";
import { IDocumentRecipient } from "@/models/Document";
import { Button } from "@/components/Button";
import PermissionHintPopover from "@/components/PermissionHintPopover";

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
    currentRecipientId?: string;
    currentRecipient?: Recipient;
    status: string;
    deletedAt?: string | null;
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
  const latestFieldsRef = useRef<DocumentField[]>([]);

  const [captureData, setCaptureData] = useState<Partial<IDocumentRecipient>>({});
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isGpsConfirmed, setIsGpsConfirmed] = useState(false);
  
  let gpsErrorSr="Location permission denied";

  const getDeviceInfo = (): { type: 'mobile' | 'desktop' | 'tablet'; os: string; browser: string; userAgent: string } => {
    const userAgent = navigator.userAgent;
    let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    
    if (/tablet|ipad|playbook|silk|(android(?!.*mobi))/i.test(userAgent)) {
      type = 'tablet';
    } else if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      type = 'mobile';
    }

    return {
      type,
      os: navigator.platform,
      browser: navigator.appCodeName,
      userAgent: navigator.userAgent,
    };
  };

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
        pendingRequiredCount > 0 && (recipient.status === "signed" || recipient.status === "approved")
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
      const resolvedRecipientId =
        recipientId || currentRecipientId || currentRecipient?.id || null;

      if (action === "signed") {
        const fields =
          latestFieldsRef.current.length > 0
            ? latestFieldsRef.current
            : doc?.fields ?? [];
        const response = await fetch("/api/sign-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, fields, recipientId: resolvedRecipientId, ...captureData }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to sign document");
        }

        setDoc(prevDoc => {
          if (!prevDoc) return null;
          const newRecipients = prevDoc.recipients.map(r => {
            if (r.id === resolvedRecipientId) {
              return { ...r, status: action };
            }
            return r;
          });
          return { ...prevDoc, recipients: newRecipients };
        });

        setIsSigned(true);
        setCurrentRecipient(prev => prev ? { ...prev, status: action } : null);
        return;
      }

      console.log('Calling signedDocument API with:', { token, recipientId: resolvedRecipientId, action });

      const response = await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId: resolvedRecipientId, action, ...captureData }),
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response data:', result);

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${action} document`);
      }

      setDoc(prevDoc => {
        if (!prevDoc) return null;
        const newRecipients = prevDoc.recipients.map(r => {
            if (r.id === resolvedRecipientId) {
                return { ...r, status: action };
            }
            return r;
        });
        return { ...prevDoc, recipients: newRecipients };
      });

      if (action === 'approved' || action === 'rejected') {
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
  }, [token, captureData, currentRecipientId, currentRecipient]);
  
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        if (!token) throw new Error("Signing token not specified");
        setLoading(true);
        const recipientId = new URLSearchParams(window.location.search).get("recipient");
        const res = await fetch(`/api/sign-document?token=${encodeURIComponent(token)}&recipient=${recipientId}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Invalid or expired signing link.");

        const data: SignDocumentResponse = await res.json();
        if (!data.success || !data.document) notFound();

        if (data.document.deletedAt) {
          return "This document has been trashed and is no longer accessible.";
        }

        setDoc(data.document);
        latestFieldsRef.current = Array.isArray(data.document?.fields) ? data.document.fields : [];

        const resolvedRecipientId =
          data.document.currentRecipientId ??
          recipientId ??
          data.document.currentRecipient?.id;

        const recipient =
          (resolvedRecipientId
            ? data.document.recipients.find(r => r.id === resolvedRecipientId)
            : null) ?? data.document.currentRecipient ?? null;

        if (recipient) {
          setCurrentRecipientId(recipient.id);
          setCaptureData({ device: getDeviceInfo() });
          if (recipient.captureGpsLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setCaptureData(prev => ({
                  ...prev,
                  location: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracyMeters: pos.coords.accuracy,
                    capturedAt: new Date(),
                  },
                  consent: {
                    locationGranted: true,
                    grantedAt: new Date(),
                    method: 'system_prompt',
                  },
                }));
                setIsGpsModalOpen(true);
              },
              () => setGpsError(gpsErrorSr)
            );
          }
          const { normalizedRecipient, metrics, isSignedLike } = deriveRecipientState(
            data.document.fields,
            recipient
          );

          setCurrentRecipient(normalizedRecipient);
          setRecipientMetrics(metrics);
          setIsSigned(isSignedLike);

          if (normalizedRecipient?.role === "approver") {
            if (["approved", "rejected"].includes(normalizedRecipient.status)) {
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

  const handleGpsConfirm = () => {
    setIsGpsConfirmed(true);
    setIsGpsModalOpen(false);
  };

  const handleGpsCancel = () => {
    setIsGpsConfirmed(false);
    setIsGpsModalOpen(false);
    setGpsError("GPS confirmation is required to sign this document.");
  };

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

    if (gpsError)
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-4">
          <AlertCircle className="text-red-500" />
          <p>{gpsError}</p>
          <PermissionHintPopover visible={gpsError === gpsErrorSr}/>
          {!isGpsConfirmed && gpsError !== gpsErrorSr &&
            <Button
              onClick={() => {
                setGpsError(null);
                setIsGpsConfirmed(false);
                setIsGpsModalOpen(true);
              }}
              label="Retry Location"
            />}
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
    <>
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
      {/* GPS MODAL */}
      <Modal visible={isGpsModalOpen} onClose={handleGpsCancel} handleConfirm={handleGpsConfirm} title="Confirm your location">
          {captureData.location && (
            <Map
              latitude={captureData.location.latitude}
              longitude={captureData.location.longitude}
            />
          )}                
      </Modal>
        {doc && (
          <DocumentEditor
            documentId={doc.id}
            initialFileUrl={doc.fileUrl}
            initialResourceName={doc.name}
            initialFields={doc.fields}
            initialRecipients={doc.recipients}
            isSigningMode={true}
            isSigned={isSigned}
            onPageChange={setPage}
            onNumPagesChange={setNumPages}
            signingToken={token}
            onSignedSaveDocument={(fn: () => Promise<void>) => {
              saveRef.current = fn;
            }}
            currentRecipientId={currentRecipientId}
            onFieldsChange={(fields: DocumentField[]) => {
              // Prevent infinite loop by checking if fields actually changed
              const fieldsStr = JSON.stringify(fields);
              if (lastFieldsRef.current !== fieldsStr) {
                lastFieldsRef.current = fieldsStr;
                latestFieldsRef.current = fields;
                setDoc(prev => prev ? { ...prev, fields } : null);
              }
            }}
          />
        )}
    <footer className="fixed bottom-0 w-full h-[90px]">
      {doc && currentRecipient && (() => {
        const roleDef = ROLES.find(r => r.value === currentRecipient.role);
        const Icon = roleDef?.icon;
        const { assignedCount, filledCount, pendingRequiredCount } = recipientMetrics;
        const allRequiredFieldsFilled = pendingRequiredCount === 0;

        if (currentRecipient.isCC || currentRecipient.role === 'viewer') {
          return <p className="mt-4 text-gray-600 font-medium">You are a viewer for this document and will be notified upon completion.</p>;
        }

        if (currentRecipient.role === 'signer') {
          // If already signed, show completion message
          if (currentRecipient.status === 'signed') {
            return (
              <div className="mt-4 text-center">
                <p className="text-green-600 font-medium">✓ You have signed this document.</p>
                <small className="text-gray-500">
                  {filledCount} of {assignedCount} fields completed
                </small>
              </div>
            );
          }
          if (currentRecipient.status === 'rejected') {
            return (
              <div className="mt-4 text-center">
                <p className="text-red-600 font-medium">You have rejected this document.</p>
              </div>
            );
          }

          // Not signed yet - show progress and button
          return (
            <div className="text-xs text-center mt-2">
            
                {filledCount} of {assignedCount} fields completed 
                {!allRequiredFieldsFilled && (
                  <><span className="px-3">|</span>{pendingRequiredCount} required field {pendingRequiredCount > 1 ? 's' : ''} remaining </>
                )}
             
            <div className="space-x-2 mt-2">
              <Button
                onClick={async () => {
                  if (!allRequiredFieldsFilled) return; // Safety check
                
                  try {
                    await handleSignOrApprove('signed');
                  } catch (error) {
                    console.error('Error during signing:', error);
                    alert('Failed to sign document. Please try again.');
                  }
                }}
                disabled={!allRequiredFieldsFilled}
                className="text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: currentRecipient.color }}
                title={!allRequiredFieldsFilled ? 'Please fill all required fields before signing' : 'Click to sign the document'}
                label="Sign Document" icon={<Edit2Icon size={12} />} />                       
                <Button
                  onClick={() => handleSignOrApprove('rejected')}
                  className="bg-red-600 text-white hover:bg-red-700"
                  icon={<X size={12} />}
                  label="Reject"
                />
              </div>
            </div>
          );
        }

        if (currentRecipient.role === 'approver') {
          if (approvalStatus === 'approved') {
            return  <p className="text-green-600 font-medium">✓ You have approved this document.</p>;
          }
          if (approvalStatus === 'rejected') {
            return <div className="mt-4 text-center">
              <p className="text-red-600 font-medium">You have rejected this document.</p>
            </div>;
          }
          return (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex gap-4">
                <Button
                  onClick={() => handleSignOrApprove('approved')}
                  className="text-white hover:opacity-80"
                  style={{backgroundColor: currentRecipient.color}}
                  icon={Icon && <Icon size={12} />}
                  label="Approve Document"
                />
                <Button
                    onClick={() => handleSignOrApprove('rejected')}
                    className="bg-red-600 text-white hover:bg-red-700"
                    label="Reject"
                    icon={<X size={12} /> }
                  />
              </div>
            </div>
          );
        }

        return null;
      })()}
      </footer>
    </>
  );
};

export default SignPageClient;
