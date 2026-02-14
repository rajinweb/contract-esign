"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import { areDroppedComponentsEqual, areRecipientsEqual } from '@/utils/comparison';
import { blobToURL, downloadPdf, mergeFieldsIntoPdf, sanitizeFileName, savePdfBlob } from '@/lib/pdf';
import { getFieldTypeFromComponentLabel, uploadToServer } from '@/lib/api';
import { serializePageRect } from '@/utils/builder/pageRect';
import { Doc, DroppedComponent, HandleSavePDFOptions, Recipient } from '@/types/types';

interface UseDocumentSaveArgs {
  selectedFile: File | string | Doc | null;
  setSelectedFile: (value: File | string | Doc | null) => void;
  pdfDoc: PDFDocument | null;
  documentName: string;
  setDocumentName: (name: string) => void;
  droppedComponents: DroppedComponent[];
  recipients: Recipient[];
  currentPage: number;
  zoom: number;
  documentId: string | null;
  setDocumentId: React.Dispatch<React.SetStateAction<string | null>>;
  signingToken?: string;
  isReadOnly: boolean;
  isLoggedIn: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  documentRef: React.RefObject<HTMLDivElement>;
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  resetHistory: () => void;
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setShowDeletedDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  autoDate: boolean;
  isEditingFileName: boolean;
  isPreviewOnly: boolean;
}

export const useDocumentSave = ({
  selectedFile,
  setSelectedFile,
  pdfDoc,
  documentName,
  setDocumentName,
  droppedComponents,
  recipients,
  currentPage,
  zoom,
  documentId,
  setDocumentId,
  signingToken,
  isReadOnly,
  isLoggedIn,
  setShowModal,
  documentRef,
  pageRefs,
  setDroppedComponents,
  resetHistory,
  setPosition,
  setShowDeletedDialog,
  setError,
  autoDate,
  isEditingFileName,
  isPreviewOnly,
}: UseDocumentSaveArgs) => {
  const [lastSavedState, setLastSavedState] = useState<{
    components: DroppedComponent[];
    name: string;
    recipients: Recipient[];
  } | null>(null);

  const lastSavedNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSavedNameRef.current === null && documentName) {
      lastSavedNameRef.current = documentName;
    }
  }, [documentName]);

  const markSavedState = useCallback((state: { components: DroppedComponent[]; name: string; recipients: Recipient[] }) => {
    setLastSavedState(state);
    lastSavedNameRef.current = state.name;
  }, []);

  const saveToServer = useCallback(async (): Promise<boolean> => {
    if (isPreviewOnly) return false;
    if (!selectedFile || !pdfDoc) return false;

    try {
      const blob = await savePdfBlob(pdfDoc);
      const safeName = sanitizeFileName(documentName);
      const currentdoc = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
      const canvasRect = documentRef.current?.getBoundingClientRect();
      const payloadComponents = droppedComponents.map(c => ({
        ...c,
        pageRect: serializePageRect(
          pageRefs.current[(c.pageNumber ?? currentPage) - 1]?.getBoundingClientRect() ?? c.pageRect,
          canvasRect,
          zoom
        ),
      }));
      const result = await uploadToServer(blob, safeName, currentPage, payloadComponents, recipients, currentdoc, setDocumentId, setDocumentName, setSelectedFile, sessionId, signingToken, false);
      if (result && result.documentId) {
        setDocumentId(result.documentId);
      }
      markSavedState({
        components: droppedComponents,
        name: result?.documentName || documentName,
        recipients: recipients,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("Status: 404")) {
        setShowDeletedDialog(true);
      } else if (errorMessage.includes("No PDF header found") || errorMessage.includes("Failed to fetch")) {
        setShowDeletedDialog(true);
      } else {
        toast.error("An error occurred while saving the document.");
      }
      return false;
    }
  }, [isPreviewOnly, selectedFile, pdfDoc, documentName, documentId, droppedComponents, recipients, currentPage, pageRefs, zoom, setDocumentId, setDocumentName, setSelectedFile, signingToken, documentRef, setShowDeletedDialog, markSavedState]);

  const handleSavePDF = useCallback(async ({
    isServerSave = false,
    isDownload = false,
    isMergeFields = false,
  }: HandleSavePDFOptions): Promise<boolean | null> => {
    if (isPreviewOnly) {
      return null;
    }
    if (!isLoggedIn) {
      setShowModal(true);
      return null;
    }

    if (!selectedFile || !pdfDoc) {
      console.error("No file selected!");
      return null;
    }
    if (isServerSave) {
      return await saveToServer();
    }

    const canvas = documentRef.current;
    const canvasRect = canvas?.getBoundingClientRect();
    if (!canvasRect) return null;

    try {
      const blob = await savePdfBlob(pdfDoc);
      const safeName = sanitizeFileName(documentName);
      const pdfUrl = await blobToURL(blob);

      if (isMergeFields || isDownload) {
        await mergeFieldsIntoPdf(pdfDoc, droppedComponents, pageRefs, canvasRect, currentPage, { autoDate });
        const mergedBlob = await savePdfBlob(pdfDoc);
        const mergedPdfUrl = await blobToURL(mergedBlob);
        setSelectedFile(mergedPdfUrl);
        if (isDownload) {
          downloadPdf(mergedBlob, safeName);
        }
      } else {
        setSelectedFile(pdfUrl);
      }
      if (isDownload && !isMergeFields) {
        downloadPdf(blob, safeName);
      }
      if (isDownload) {
        setPosition({ x: 0, y: 0 });
        setDroppedComponents([]);
        resetHistory();
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Status: 404")) {
        setShowDeletedDialog(true);
      } else {
        setError("Failed to save document.");
      }
      return null;
    }
  }, [autoDate, currentPage, documentName, documentRef, droppedComponents, isPreviewOnly, isLoggedIn, pageRefs, pdfDoc, resetHistory, saveToServer, selectedFile, setDroppedComponents, setError, setPosition, setSelectedFile, setShowDeletedDialog, setShowModal]);

  // Finalize session when user leaves the editor: persist last editHistory as metadata-only and clear session
  useEffect(() => {
    const finalizeSession = async () => {
      try {
        if (isReadOnly || isPreviewOnly) return;
        if (typeof window === 'undefined') return;
        const currentDocumentId = localStorage.getItem('currentDocumentId');
        const currentSessionId = localStorage.getItem('currentSessionId');
        if (!currentDocumentId || !currentSessionId) return;

        const formData = new FormData();
        formData.append('documentId', currentDocumentId);
        formData.append('isMetadataOnly', 'true');
        formData.append('sessionId', currentSessionId);

        const canvasRect = documentRef.current?.getBoundingClientRect();
        formData.append('fields', JSON.stringify(droppedComponents.map(comp => ({
          id: comp.fieldId ?? String(comp.id),
          type: getFieldTypeFromComponentLabel(comp.component),
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          pageNumber: comp.pageNumber || currentPage,
          pageRect: serializePageRect(
            pageRefs.current[(comp.pageNumber ?? currentPage) - 1]?.getBoundingClientRect() ?? comp.pageRect,
            canvasRect,
            zoom
          ),
          recipientId: comp.assignedRecipientId,
          required: comp.required !== false,
          value: comp.data || '',
          placeholder: comp.placeholder,
        }))));
        formData.append('recipients', JSON.stringify(recipients));
        formData.append('changeLog', 'Finalize session: metadata update');

        if (documentName && documentName.trim()) {
          const cleanName = documentName.trim();
          formData.append('documentName', cleanName);
        }

        const headers: Record<string, string> = {};
        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          keepalive: true,
          headers,
        });

        if (!res.ok) {
          console.warn('Finalize session request failed', await res.text());
        }

        localStorage.removeItem('currentSessionId');
      } catch (err) {
        console.error('Failed to finalize session:', err);
      }
    };

    window.addEventListener('beforeunload', finalizeSession);

    return () => {
      finalizeSession();
      window.removeEventListener('beforeunload', finalizeSession);
    };
  }, [droppedComponents, recipients, documentName, currentPage, isReadOnly, isPreviewOnly, documentRef, pageRefs, zoom]);

  // Auto-save metadata when user finishes renaming
  useEffect(() => {
    const saveRenameIfNeeded = async () => {
      if (isReadOnly || isPreviewOnly) return;
      const id = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      if (!id) return;
      if (lastSavedNameRef.current !== documentName && documentName && documentName.trim()) {
        try {
          const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
          const res = await uploadToServer(null, documentName.trim(), currentPage, droppedComponents, recipients, id, setDocumentId, setDocumentName, setSelectedFile, sessionId, signingToken, true);
          if (res && res.documentName) {
            setDocumentName(res.documentName as string);
            lastSavedNameRef.current = res.documentName as string;
          } else {
            lastSavedNameRef.current = documentName;
          }
        } catch (err) {
          console.error('Failed to save renamed document name:', err);
        }
      }
    };

    if (!isEditingFileName) {
      saveRenameIfNeeded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingFileName, isPreviewOnly, isReadOnly]);

  const hasUnsavedChanges = useMemo(() => {
    if (!lastSavedState) return false;

    const fieldsChanged = !areDroppedComponentsEqual(droppedComponents, lastSavedState.components);
    const recipientsChanged = !areRecipientsEqual(recipients, lastSavedState.recipients);
    const nameChanged = documentName.trim() !== lastSavedState.name.trim();

    return fieldsChanged || recipientsChanged || nameChanged;
  }, [droppedComponents, recipients, documentName, lastSavedState]);

  return {
    saveToServer,
    handleSavePDF,
    hasUnsavedChanges,
    markSavedState,
  };
};
