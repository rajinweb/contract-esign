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
    const isReadOnly =
      !isSigningMode &&
      (documentStatus === 'completed' ||
        documentStatus === 'in_progress' ||
        documentStatus === 'voided' ||
        documentStatus === 'sent' ||
        documentStatus === 'viewed');
    const isInProgress = !isSigningMode && documentStatus === 'in_progress';
    const isVoided = !isSigningMode && documentStatus === 'voided';
    const isSent = !isSigningMode && (documentStatus === 'sent' || documentStatus === 'viewed');
    const isAlreadySent =
      !isSigningMode &&
      (documentStatus === 'sent' || documentStatus === 'viewed' || documentStatus === 'in_progress');
    const isPreviewMode = isSigningMode || isReadOnly;

    return {
      isReadOnly,
      isInProgress,
      isVoided,
      isSent,
      isAlreadySent,
      isPreviewMode,
    };
  }, [isSigningMode, documentStatus]);
};
