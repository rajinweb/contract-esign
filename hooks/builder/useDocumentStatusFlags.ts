"use client";
import { useMemo } from 'react';

interface UseDocumentStatusFlagsArgs {
  isSigningMode: boolean;
  documentStatus: string | null;
}

export const useDocumentStatusFlags = ({
  isSigningMode,
  documentStatus,
}: UseDocumentStatusFlagsArgs) => {
  return useMemo(() => {
    const status = documentStatus ?? 'draft';
    const readOnlyStatuses = new Set(['completed', 'in_progress', 'voided', 'sent', 'viewed', 'rejected']);

    const isReadOnly = !isSigningMode && readOnlyStatuses.has(status);
    const isInProgress = !isSigningMode && status === 'in_progress';
    const isVoided = !isSigningMode && status === 'voided';
    const isRejected = !isSigningMode && status === 'rejected';
    const isSent = !isSigningMode && (status === 'sent' || status === 'viewed');
    const isAlreadySent = !isSigningMode && (status === 'sent' || status === 'viewed' || status === 'in_progress');
    const isPreviewMode = isSigningMode || isReadOnly;

    return {
      isReadOnly,
      isInProgress,
      isVoided,
      isRejected,
      isSent,
      isAlreadySent,
      isPreviewMode,
    };
  }, [isSigningMode, documentStatus]);
};
