"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderPinwheel, Download, X, AlertCircle, ChevronRight, RotateCcw, RotateCcwSquare, Pin } from "lucide-react";

import DocumentEditor from "@/components/builder/DocumentEditor";
import { DocumentField, Recipient, SigningViewDocument } from "@/types/types";
import { notFound } from "next/navigation";
import Brand from "@/components/Brand";
import Modal from "@/components/Modal";
import LocationMap from "@/components/Map";
import { IDocumentRecipient } from "@/models/Document";
import { Button } from "@/components/Button";
import PermissionHintPopover from "@/components/PermissionHintPopover";
import { dedupeFieldsById } from "@/utils/builder/documentFields";
import { isRecipientTurn } from "@/lib/signing-utils";

interface SignPageClientProps {
  token?: string;
  previewMode?: boolean;
  previewDocument?: SigningViewDocument | null;
}

interface SignDocumentResponse {
  success: boolean;
  document: SigningViewDocument;
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

const SignPageClient: React.FC<SignPageClientProps> = ({ token, previewMode = false, previewDocument = null }) => {
  const [doc, setDoc] = useState<SigningViewDocument | null>(null);
  const [loading, setLoading] = useState(!previewMode);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [currentRecipient, setCurrentRecipient] = useState<Recipient | null>(null);
  const [currentRecipientId, setCurrentRecipientId] = useState<string>();
  const [recipientMetrics, setRecipientMetrics] = useState<RecipientFieldMetrics>(EMPTY_METRICS);
  const [guidedMode, setGuidedMode] = useState<"idle" | "active" | "complete">("idle");
  const [guidedFieldId, setGuidedFieldId] = useState<string | null>(null);
  const [manualReview, setManualReview] = useState(false);
  const [reviewedFieldIds, setReviewedFieldIds] = useState<Set<string>>(new Set());
  const lastFieldsRef = useRef<string>('');
  const latestFieldsRef = useRef<DocumentField[]>([]);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const [captureData, setCaptureData] = useState<Partial<IDocumentRecipient>>({});
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isGpsConfirmed, setIsGpsConfirmed] = useState(false);

  const gpsErrorSr = "Location permission denied";

  const getFieldId = useCallback((field: DocumentField) => {
    const rawId = (field as { fieldId?: string }).fieldId ?? field.id;
    return String(rawId);
  }, []);

  const isFieldFilled = useCallback((field: DocumentField) => {
    const value = field.value;
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }, []);

  const normalizedFields = useMemo(
    () => dedupeFieldsById(doc?.fields || []),
    [doc?.fields]
  );

  const orderedRequiredFields = useMemo(() => {
    if (!doc || !currentRecipientId) return [];
    return normalizedFields
      .filter((field) => field.recipientId === currentRecipientId)
      .filter((field) => field.required !== false)
      .sort((a, b) => {
        const pageA = a.pageNumber ?? 0;
        const pageB = b.pageNumber ?? 0;
        if (pageA !== pageB) return pageA - pageB;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
  }, [doc, currentRecipientId, normalizedFields]);

  const pendingRequiredFields = useMemo(
    () => orderedRequiredFields.filter((field) => !isFieldFilled(field)),
    [orderedRequiredFields, isFieldFilled]
  );

  const allRequiredFieldsFilled = pendingRequiredFields.length === 0;
  const isGuidedEligible = Boolean(currentRecipient && !currentRecipient.isCC && currentRecipient.role !== "viewer");
  const isApprover = currentRecipient?.role === "approver";
  const finishAction: Recipient["status"] = isApprover ? "approved" : "signed";
  const finishLabel = isApprover ? "Approve Document" : "Finish & Sign";
  const requestLabel = isApprover ? "approval request" : "signature request";
  const completionLabel = isApprover ? "approved" : "signed";
  const derivedGuidedMode =
    isSigned || (allRequiredFieldsFilled && !manualReview) ? "complete" : guidedMode;
  const guidedStatusLabel =
    derivedGuidedMode === "idle"
      ? "Ready"
      : derivedGuidedMode === "active"
        ? "In progress"
        : "Complete";
  const guidedStatusColor =
    derivedGuidedMode === "complete"
      ? "text-emerald-600"
      : derivedGuidedMode === "active"
        ? "text-blue-600"
        : "text-gray-600";
  const isActionComplete =
    isSigned || currentRecipient?.status === "signed" || currentRecipient?.status === "approved";
  const isRejected = currentRecipient?.status === "rejected";
  const isSequential = doc?.signingMode === "sequential";
  const isTurnAllowed = !isSequential || (currentRecipient ? isRecipientTurn(currentRecipient, doc?.recipients ?? []) : false);
  const reviewTotal = orderedRequiredFields.length;
  const reviewCount = Math.min(reviewedFieldIds.size, reviewTotal);
  const reviewComplete = manualReview ? reviewTotal === 0 || reviewCount >= reviewTotal : false;
  const canAdvance = manualReview
    ? orderedRequiredFields.length > 0
    : pendingRequiredFields.length > 0;
  const hasSingleAssignedField = recipientMetrics.assignedCount === 1;
  const hasMultipleAssignedFields = recipientMetrics.assignedCount > 1;
  const hasAssignedFields = recipientMetrics.assignedCount > 0;
  const canFinish = isApprover ? true : allRequiredFieldsFilled;
  const showFinish =
    !isActionComplete &&
    !isRejected &&
    (isApprover || hasAssignedFields) &&
    isTurnAllowed &&
    canFinish &&
    (!manualReview || reviewComplete || isApprover);
  const showNext =
    derivedGuidedMode !== "idle" &&
    !isActionComplete &&
    !isRejected &&
    isTurnAllowed &&
    !showFinish &&
    canAdvance &&
    hasMultipleAssignedFields;
  const showRestart =
    !isActionComplete &&
    !isRejected &&
    isTurnAllowed &&
    hasMultipleAssignedFields &&
    recipientMetrics.filledCount > 0;
  const showReject = isGuidedEligible && !isActionComplete && !isRejected && isTurnAllowed;

  const requiredTotal = orderedRequiredFields.length;
  const requiredDone = Math.max(0, requiredTotal - pendingRequiredFields.length);
  const progressPercent = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;

  const documentStatusLabel = doc?.status ? doc.status.replace(/_/g, " ") : "";
  const recipientColor = currentRecipient?.color ?? "#E5E7EB";

  const focusFieldById = useCallback((fieldId: string) => {
    if (typeof document === "undefined") return;
    const safeId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(fieldId)
        : fieldId.replace(/["\\]/g, "\\$&");
    const element = document.querySelector(`[data-field-id="${safeId}"]`) as HTMLElement | null;
    if (!element) return;

    setGuidedFieldId(fieldId);
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const input = element.querySelector("textarea, input") as HTMLElement | null;
    if (input && typeof input.focus === "function") {
      input.focus();
      if ("select" in input && typeof (input as HTMLInputElement).select === "function") {
        (input as HTMLInputElement).select();
      }
    }
  }, []);

  const startGuidedSigning = useCallback((forceReview = false) => {
    if (!currentRecipient || currentRecipient.role === "viewer" || currentRecipient.isCC) return;
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const targetField = forceReview
      ? orderedRequiredFields[0]
      : pendingRequiredFields[0] ?? orderedRequiredFields[0];
    if (!targetField) {
      setGuidedMode("complete");
      setGuidedFieldId(null);
      setManualReview(false);
      return;
    }
    if (pendingRequiredFields.length === 0 && !forceReview) {
      setGuidedMode("complete");
      setGuidedFieldId(null);
      setManualReview(false);
      return;
    }
    setManualReview(forceReview);
    if (forceReview) {
      setReviewedFieldIds(new Set());
    }
    setGuidedMode("active");
    focusFieldById(getFieldId(targetField));
  }, [
    currentRecipient,
    focusFieldById,
    getFieldId,
    orderedRequiredFields,
    pendingRequiredFields,
  ]);

  const focusNextRequired = useCallback(() => {
    if (manualReview) {
      if (orderedRequiredFields.length === 0) {
        setGuidedMode("complete");
        setGuidedFieldId(null);
        return;
      }

      const currentIndex = guidedFieldId
        ? orderedRequiredFields.findIndex((field) => getFieldId(field) === guidedFieldId)
        : -1;
      const nextIndex =
        currentIndex >= 0 && currentIndex < orderedRequiredFields.length - 1
          ? currentIndex + 1
          : 0;
      focusFieldById(getFieldId(orderedRequiredFields[nextIndex]));
      return;
    }

    if (pendingRequiredFields.length === 0) {
      setGuidedMode("complete");
      setGuidedFieldId(null);
      return;
    }

    // Always route to the earliest remaining required field in document order
    focusFieldById(getFieldId(pendingRequiredFields[0]));
  }, [
    focusFieldById,
    getFieldId,
    guidedFieldId,
    manualReview,
    orderedRequiredFields,
    pendingRequiredFields,
  ]);


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
        (field) => field.required !== false && !isFieldFilled(field)
      ).length;
      const filledCount = assigned.filter((field) => isFieldFilled(field)).length;

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
    [isFieldFilled]
  );

  const handleSignOrApprove = useCallback(async (action: Recipient["status"]) => {
    if (previewMode) {
      return;
    }
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

      const response = await fetch("/api/signedDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, recipientId: resolvedRecipientId, action, ...captureData }),
      });
      const result = await response.json();

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
        setIsSigned(action === 'approved');
        // Update current recipient status in local state
        setCurrentRecipient(prev => prev ? { ...prev, status: action } : null);
      }
    } catch (err) {
      console.error('Error in handleSignOrApprove:', err);
      alert(`Failed to ${action} document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [previewMode, token, captureData, currentRecipientId, currentRecipient, doc]);

  useEffect(() => {
    if (!previewMode) return;

    if (!previewDocument) {
      setError("Preview document is not available.");
      setLoading(false);
      return;
    }

    if (previewDocument.deletedAt) {
      setError("This document has been trashed and is no longer accessible.");
      setLoading(false);
      return;
    }

    setError(null);
    setDoc(previewDocument);

    const previewFields = Array.isArray(previewDocument.fields) ? previewDocument.fields : [];
    latestFieldsRef.current = previewFields;
    lastFieldsRef.current = '';

    const previewFieldCountByRecipient = new Map<string, number>();
    previewFields.forEach((field) => {
      if (!field.recipientId) return;
      previewFieldCountByRecipient.set(
        field.recipientId,
        (previewFieldCountByRecipient.get(field.recipientId) ?? 0) + 1
      );
    });

    const resolvedRecipientId =
      previewDocument.currentRecipientId ??
      previewDocument.currentRecipient?.id ??
      previewDocument.recipients.find((recipient) => {
        if (recipient.isCC || recipient.role === "viewer") return false;
        return (previewFieldCountByRecipient.get(recipient.id) ?? 0) > 0;
      })?.id ??
      previewDocument.recipients.find((recipient) => !recipient.isCC && recipient.role !== "viewer")?.id ??
      previewDocument.recipients.find(
        (recipient) => (previewFieldCountByRecipient.get(recipient.id) ?? 0) > 0
      )?.id ??
      previewDocument.recipients[0]?.id;

    const recipient =
      (resolvedRecipientId
        ? previewDocument.recipients.find((r) => r.id === resolvedRecipientId)
        : null) ?? previewDocument.currentRecipient ?? null;

    if (recipient) {
      const { normalizedRecipient, metrics, isSignedLike } = deriveRecipientState(
        previewFields,
        recipient
      );
      setCurrentRecipientId(recipient.id);
      setCurrentRecipient(normalizedRecipient);
      setRecipientMetrics(metrics);
      setIsSigned(isSignedLike);
    } else {
      setCurrentRecipientId(undefined);
      setCurrentRecipient(null);
      setRecipientMetrics(EMPTY_METRICS);
      setIsSigned(false);
    }

    setCaptureData({});
    setIsGpsConfirmed(true);
    setIsGpsModalOpen(false);
    setGpsError(null);
    setLoading(false);
  }, [previewDocument, previewMode, deriveRecipientState]);

  useEffect(() => {
    if (previewMode) return;

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
          setError("This document has been trashed and is no longer accessible.");
          return;
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

          const gpsCacheKey = `gps:${token}:${recipient.id}`;
          let cachedGps: { location?: any; consent?: any } | null = null;
          if (typeof window !== "undefined") {
            try {
              const raw = window.sessionStorage.getItem(gpsCacheKey);
              cachedGps = raw ? JSON.parse(raw) : null;
            } catch {
              cachedGps = null;
            }
          }

          const hasCachedGps =
            !!cachedGps?.consent?.locationGranted && !!cachedGps?.location;
          const hasServerGps =
            !!recipient?.consent?.locationGranted && !!recipient?.location;

          if (hasCachedGps || hasServerGps) {
            const source = hasCachedGps ? cachedGps : recipient;
            setCaptureData(prev => ({
              ...prev,
              location: source?.location,
              consent: source?.consent,
            }));
            setIsGpsConfirmed(true);
          } else if (recipient.captureGpsLocation && navigator.geolocation) {
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
        } else {
          setCurrentRecipient(null);
          setRecipientMetrics(EMPTY_METRICS);
          setIsSigned(false);
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
  }, [previewMode, token, deriveRecipientState]);

  const handleGpsConfirm = () => {
    setIsGpsConfirmed(true);
    setIsGpsModalOpen(false);
    try {
      if (typeof window !== "undefined" && currentRecipientId) {
        const cacheKey = `gps:${token}:${currentRecipientId}`;
        const payload = {
          location: captureData.location,
          consent: captureData.consent,
        };
        window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      }
    } catch {
      // Ignore storage errors
    }
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
    } else {
      if (currentRecipient) {
        setCurrentRecipient(null);
      }
    }
  }, [doc, currentRecipientId, currentRecipient, deriveRecipientState]);

  useEffect(() => {
    if (isSigned) {
      setGuidedMode("complete");
      setGuidedFieldId(null);
      setManualReview(false);
      return;
    }
    if (guidedMode === "active" && pendingRequiredFields.length === 0) {
      if (manualReview) {
        return;
      }
      setGuidedMode("complete");
      setGuidedFieldId(null);
    }
  }, [guidedMode, isSigned, manualReview, pendingRequiredFields.length]);

  useEffect(() => {
    if (
      derivedGuidedMode !== "active" ||
      !guidedFieldId ||
      !doc ||
      !currentRecipientId
    ) {
      return;
    }
    if (manualReview) return;

    const currentField = normalizedFields.find(
      (field) => getFieldId(field) === guidedFieldId
    );

    if (!currentField) return;
    if (currentField.recipientId !== currentRecipientId) return;
    if (!isFieldFilled(currentField)) return;
    if (pendingRequiredFields.length === 0) return;

    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }
    const timer = window.setTimeout(() => {
      focusNextRequired();
    }, 200);

    autoAdvanceTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (autoAdvanceTimerRef.current === timer) {
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [
    currentRecipientId,
    derivedGuidedMode,
    doc,
    focusNextRequired,
    getFieldId,
    guidedFieldId,
    isFieldFilled,
    manualReview,
    normalizedFields,
    pendingRequiredFields.length,
  ]);

  useEffect(() => {
    setGuidedMode("idle");
    setGuidedFieldId(null);
    setManualReview(false);
    setReviewedFieldIds(new Set());
  }, [currentRecipientId]);

  useEffect(() => {
    if (!manualReview || !guidedFieldId) return;
    setReviewedFieldIds((prev) => {
      if (prev.has(guidedFieldId)) return prev;
      const next = new Set(prev);
      next.add(guidedFieldId);
      return next;
    });
  }, [guidedFieldId, manualReview]);

  useEffect(() => {
    if (!manualReview) return;
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, [manualReview]);

  useEffect(() => {
    if (!isGuidedEligible || isActionComplete || isRejected) return;
    if (derivedGuidedMode !== "idle") return;
    if (pendingRequiredFields.length === 0) return;

    startGuidedSigning();
  }, [
    derivedGuidedMode,
    isActionComplete,
    isGuidedEligible,
    isRejected,
    pendingRequiredFields.length,
    startGuidedSigning,
  ]);

  // Keep sequential signers updated while they wait for earlier recipients to complete.
  const refreshDocument = useCallback(async () => {
    try {
      if (previewMode || !token) return;
      const recipientId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("recipient")
          : null;
      const res = await fetch(
        `/api/sign-document?token=${encodeURIComponent(token)}&recipient=${recipientId ?? ''}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;

      const data: SignDocumentResponse = await res.json();
      if (!data?.success || !data.document) return;
      if (data.document.deletedAt) {
        setError("This document has been trashed and is no longer accessible.");
        return;
      }

      const nextFields =
        lastFieldsRef.current.length === 0
          ? data.document.fields
          : (latestFieldsRef.current.length > 0 ? latestFieldsRef.current : data.document.fields);
      setDoc(prev =>
        prev
          ? { ...prev, ...data.document, fields: nextFields }
          : { ...data.document, fields: nextFields }
      );

      const resolvedRecipientId =
        data.document.currentRecipientId ??
        recipientId ??
        data.document.currentRecipient?.id;
      const recipient =
        (resolvedRecipientId
          ? data.document.recipients.find(r => r.id === resolvedRecipientId)
          : null) ?? data.document.currentRecipient ?? null;

      const { normalizedRecipient, metrics, isSignedLike } = deriveRecipientState(
        nextFields,
        recipient
      );
      setCurrentRecipientId(resolvedRecipientId ?? undefined);
      setCurrentRecipient(normalizedRecipient);
      setRecipientMetrics(metrics);
      setIsSigned(isSignedLike);
    } catch (err) {
      console.error('Error refreshing document:', err);
    }
  }, [previewMode, token, deriveRecipientState]);

  useEffect(() => {
    if (!isSequential || isActionComplete || isRejected || isTurnAllowed) return;
    refreshDocument();
    const interval = window.setInterval(refreshDocument, 15000);
    return () => window.clearInterval(interval);
  }, [isSequential, isActionComplete, isRejected, isTurnAllowed, refreshDocument]);

  const renderCenteredMessage = (message: string, icon?: React.ReactNode) => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 text-red-500">
      {icon}
      <p>{message}</p>
    </div>
  );

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen w-full">
        <LoaderPinwheel className="animate-spin" size={40} color="#2563eb" />
      </div>
    );

  if (gpsError) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <AlertCircle className="text-red-500" />
        <p>{gpsError}</p>
        <PermissionHintPopover visible={gpsError === gpsErrorSr} />
        {!isGpsConfirmed && gpsError !== gpsErrorSr && (
          <Button
            onClick={() => {
              setGpsError(null);
              setIsGpsConfirmed(false);
              setIsGpsModalOpen(true);
            }}
            label="Retry Location"
          />
        )}
      </div>
    );
  }
  if (error) return renderCenteredMessage(error);
  if (!previewMode && !token) return renderCenteredMessage("Invalid link");

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <header className="w-full bg-white border-b px-4 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Brand />
        <div className="text-xs space-y-1.5">
          {currentRecipient && (
            <span className="flex items-center gap-2 font-medium  text-black">
              <span className="border-b" style={{ borderBottomColor: recipientColor }}>
                Hello, {currentRecipient.name || "Recipient"}
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: `${recipientColor}33` }}>
                {currentRecipient.isCC ? "CC" : currentRecipient.role}
              </span>
            </span>
          )}
          <div className="text-xs text-gray-500 gap-1 flex flex-wrap">
            <span>
              You have {requestLabel} for
            </span>
            <span className="font-semibold text-gray-900 truncate" title={doc?.name || "Document"}>
              {doc?.name || "Document"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {documentStatusLabel && (
            <span
              className="rounded-full px-2 py-1 text-xs text-black"
              style={{ backgroundColor: `${recipientColor}50` }}
            >
              {documentStatusLabel}
            </span>
          )}
          <a
            href={doc?.fileUrl}
            download
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center text-xs"
          >
            <Download size={16} className="mr-2" />
            Download
          </a>
        </div>
      </header>
      <div className="flex-1 min-h-0 w-full">
        {/* GPS MODAL */}
        <Modal visible={isGpsModalOpen} onClose={handleGpsCancel} handleConfirm={handleGpsConfirm} title="Confirm your location">
          {captureData.location && (
            <LocationMap
              latitude={captureData.location.latitude}
              longitude={captureData.location.longitude}
            />
          )}
        </Modal>

        {doc && (
          <>
            <div className="h-full min-h-0">
              <DocumentEditor
                documentId={doc.id}
                initialFileUrl={doc.fileUrl}
                initialResourceName={doc.name}
                initialFields={doc.fields}
                initialRecipients={doc.recipients}
                isSigningMode={true}
                isPreviewOnly={previewMode}
                isSigned={isSigned}
                onPageChange={setPage}
                onNumPagesChange={setNumPages}
                signingToken={token}
                currentRecipientId={currentRecipientId}
                guidedFieldId={guidedFieldId}
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
            </div>

            <div className="fixed bottom-4 left-1/2 z-40 w-1/2 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur">
              <div className="flex justify-between ">
                <div className="font-semibold text-sm text-gray-900 flex items-center gap-2 mb-1">
                  Your Progress
                  <small className={`rounded-full text-xs px-2 h-4 py-0 ${guidedStatusColor} bg-slate-100`}>
                    {guidedStatusLabel}
                  </small>
                  {recipientMetrics.assignedCount > 0 && (
                    <small
                      className="p-1 rounded-md font-normal text-xs"
                      style={{ backgroundColor: currentRecipient?.color + "50" }}
                    >
                      {recipientMetrics.filledCount}/{recipientMetrics.assignedCount}
                    </small>
                  )}
                </div>

                {!currentRecipient && "Recipient not found for this signing link."}
                {currentRecipient && (
                  <div
                    key={currentRecipient.id}
                    className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs relative"
                    style={{ borderColor: currentRecipient.color }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentRecipient.color }} />
                    <span className="font-medium text-gray-900 truncate">{currentRecipient.name} — </span>
                    {currentRecipient && (currentRecipient.isCC || currentRecipient.role === "viewer") && (
                      "You are a viewer for this document and will be notified upon completion."
                    )}

                    {currentRecipient && isGuidedEligible && pendingRequiredFields.length > 0 && (
                      `${pendingRequiredFields.length} of ${requiredTotal} required field${pendingRequiredFields.length > 1 ? "s" : ""} remaining`
                    )}
                    {currentRecipient && isGuidedEligible && pendingRequiredFields.length === 0 && (
                      isApprover
                        ? "All required fields are complete. You can approve this document."
                        : "All required fields are complete. You can finish signing."
                    )}
                    <div
                      className="h-full rounded-full transition-all absolute left-0"
                      style={{ width: `${progressPercent}%`, backgroundColor: currentRecipient.color + "20" }}
                    />
                  </div>
                )}

              </div>


              {isGuidedEligible && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                  {!isTurnAllowed && !isActionComplete && !isRejected && (
                    <span className="text-amber-600">
                      Waiting for the previous signer to complete.
                    </span>
                  )}
                  {showNext && (
                    <Button
                      title="Next"
                      onClick={focusNextRequired}
                      disabled={!canAdvance}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  )}
                  {showFinish && (
                    <Button
                      label={finishLabel}
                      onClick={() => handleSignOrApprove(finishAction)}
                      disabled={previewMode || isSigned || !canFinish}
                      className="text-white hover:brightness-95"
                      style={
                        !isSigned && allRequiredFieldsFilled
                          ? { backgroundColor: recipientColor }
                          : undefined
                      }
                      icon={<Pin size={16} className="-rotate-45" />}
                      title={
                        previewMode
                          ? "Preview mode: finishing is disabled"
                          : manualReview && !reviewComplete
                            ? "Review all required fields before finishing"
                            : undefined
                      }
                    />
                  )}
                  {showRestart && (
                    <Button
                      label="Review"
                      inverted
                      onClick={() => startGuidedSigning(true)}
                      disabled={isSigned}
                      icon={<RotateCcwSquare size={16} />}
                    />
                  )}
                  {showReject && (
                    <Button
                      onClick={() => handleSignOrApprove('rejected')}
                      disabled={previewMode}
                      title={previewMode ? "Preview mode: rejection is disabled" : undefined}
                      className={previewMode ? "" : "bg-red-600 text-white hover:bg-red-700"}
                      icon={<X size={12} />}
                      label="Reject"
                    />
                  )}

                  {isActionComplete && (
                    <span className="text-emerald-600">
                      ✓ You have {completionLabel} this document.
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-red-600">
                      You have rejected this document.
                    </span>
                  )}

                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignPageClient;
