"use client";
import { useEffect } from 'react';
import { DroppedComponent, Doc, Recipient } from '@/types/types';
import { getFieldTypeFromComponentLabel } from '@/lib/api';
import { serializePageRect } from '@/utils/builder/pageRect';
import { buildDraftKey } from '@/utils/builder/documentDraft';

interface UseDocumentDraftArgs {
  documentId: string | null;
  droppedComponents: DroppedComponent[];
  recipients: Recipient[];
  documentName: string;
  selectedFile: File | string | Doc | null;
  currentPage: number;
  zoom: number;
  documentRef: React.RefObject<HTMLDivElement>;
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
}

export const useDocumentDraft = ({
  documentId,
  droppedComponents,
  recipients,
  documentName,
  selectedFile,
  currentPage,
  zoom,
  documentRef,
  pageRefs,
}: UseDocumentDraftArgs) => {
  useEffect(() => {
    if (!documentId) return;

    const timeout = setTimeout(() => {
      const canvasRect = documentRef.current?.getBoundingClientRect();
      const payload = {
        fields: droppedComponents.map(c => ({
          id: c.fieldId ?? c.id?.toString(),
          type: getFieldTypeFromComponentLabel(c.component || ''),
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
          pageNumber: c.pageNumber,
          pageRect: serializePageRect(
            pageRefs.current[(c.pageNumber ?? currentPage) - 1]?.getBoundingClientRect() ?? c.pageRect,
            canvasRect,
            zoom
          ),
          recipientId: c.assignedRecipientId,
          required: c.required,
          value: c.data,
          placeholder: c.placeholder,
          fieldOwner: c.fieldOwner,
          fieldId: c.fieldId ?? c.id?.toString(),
        })),
        recipients,
        documentName,
        fileUrl: typeof selectedFile === 'string' ? selectedFile : null,
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(buildDraftKey(documentId), JSON.stringify(payload));
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    droppedComponents,
    recipients,
    documentName,
    selectedFile,
    documentId,
    currentPage,
    zoom,
    documentRef,
    pageRefs,
  ]);
};
