"use client";
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UseDocumentActionsArgs {
  documentId: string | null;
  documentName: string;
  setShowDeriveModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowVoidModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useDocumentActions = ({
  documentId,
  documentName,
  setShowDeriveModal,
  setShowVoidModal,
}: UseDocumentActionsArgs) => {
  const router = useRouter();
  const [isDownloadingSigned, setIsDownloadingSigned] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  const handleDownloadSigned = useCallback(async () => {
    if (!documentId) return;
    try {
      setIsDownloadingSigned(true);
      const res = await fetch(`/api/documents/download-signed?documentId=${encodeURIComponent(documentId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to download signed document');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentName || 'document'}-signed.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Signed document downloaded successfully');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to download signed document');
      }
    } finally {
      setIsDownloadingSigned(false);
    }
  }, [documentId, documentName]);

  const handleDeriveDocument = useCallback(async () => {
    if (!documentId) return;
    try {
      setIsDeriving(true);
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/derive`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create derived document');
      }
      const data = await res.json();
      const newDocId = data.documentId;
      if (newDocId) {
        localStorage.setItem('currentDocumentId', newDocId);
        localStorage.removeItem('currentSessionId');
        router.push(`/builder/${newDocId}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to create derived document');
      }
    } finally {
      setIsDeriving(false);
      setShowDeriveModal(false);
    }
  }, [documentId, router, setShowDeriveModal]);

  const handleVoidAndDerive = useCallback(async () => {
    if (!documentId) return;
    try {
      setIsVoiding(true);
      const voidRes = await fetch(`/api/documents/${encodeURIComponent(documentId)}/void`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!voidRes.ok) {
        const errorData = await voidRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to void document');
      }

      const deriveRes = await fetch(`/api/documents/${encodeURIComponent(documentId)}/derive`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!deriveRes.ok) {
        const errorData = await deriveRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create derived document');
      }
      const data = await deriveRes.json();
      const newDocId = data.documentId;
      if (newDocId) {
        localStorage.setItem('currentDocumentId', newDocId);
        localStorage.removeItem('currentSessionId');
        router.push(`/builder/${newDocId}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to void and create new document');
      }
    } finally {
      setIsVoiding(false);
      setShowVoidModal(false);
    }
  }, [documentId, router, setShowVoidModal]);

  return {
    isDownloadingSigned,
    isDeriving,
    isVoiding,
    handleDownloadSigned,
    handleDeriveDocument,
    handleVoidAndDerive,
  };
};
