'use client';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Doc, DocumentField, DocumentFieldType, DroppedComponent } from '@/types/types';
import { getFieldTypeFromComponentLabel } from '@/lib/api';
import { serializePageRect } from '@/utils/builder/pageRect';

const SaveAsTemplateModal = dynamic(() => import('@/components/SaveAsTemplateModal'), { ssr: false });

interface SaveAsTemplateGateProps {
  showSaveAsTemplate: boolean;
  isLoggedIn: boolean;
  setShowSaveAsTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  documentId: string | null;
  documentName: string;
  selectedFile: string | File | Doc | null;
  droppedComponents: DroppedComponent[];
  pages: number[];
  documentRef: React.RefObject<HTMLDivElement>;
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  currentPage: number;
  zoom: number;
}

const SaveAsTemplateGate: React.FC<SaveAsTemplateGateProps> = ({
  showSaveAsTemplate,
  isLoggedIn,
  setShowSaveAsTemplate,
  setShowModal,
  documentId,
  documentName,
  selectedFile,
  droppedComponents,
  pages,
  documentRef,
  pageRefs,
  currentPage,
  zoom,
}) => {
  useEffect(() => {
    if (showSaveAsTemplate && !isLoggedIn) {
      setShowModal(true);
    }
  }, [showSaveAsTemplate, isLoggedIn, setShowModal]);

  const buildDocumentFields = (): DocumentField[] => {
    const canvasRect = documentRef.current?.getBoundingClientRect() ?? null;
    const pageRects = pageRefs.current.map((pageEl) => pageEl?.getBoundingClientRect() ?? null);

    return droppedComponents.map((c) => ({
      id: c.fieldId ?? String(c.id),
      type: getFieldTypeFromComponentLabel(c.component || '') as DocumentFieldType,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      pageNumber: c.pageNumber,
      pageRect: serializePageRect(
        pageRects[(c.pageNumber ?? currentPage) - 1] ?? c.pageRect,
        canvasRect,
        zoom
      ),
      recipientId: c.assignedRecipientId,
      required: c.required !== undefined ? c.required : true,
      value: c.data || '',
      placeholder: c.placeholder,
    }));
  };

  const documentFileUrl =
    typeof selectedFile === 'string'
      ? selectedFile
      : selectedFile && typeof selectedFile === 'object' && 'fileUrl' in selectedFile
        ? (selectedFile.fileUrl as string | undefined) ?? ''
        : '';

  if (!showSaveAsTemplate || !isLoggedIn) return null;

  return (
    <SaveAsTemplateModal
      documentId={documentId}
      documentName={documentName || 'Untitled'}
      documentFileUrl={documentFileUrl}
      documentFieldCount={droppedComponents.length}
      getDocumentFields={buildDocumentFields}
      documentPageCount={pages.length}
      documentFileSize={0}
      onClose={() => setShowSaveAsTemplate(false)}
    />
  );
};

export default SaveAsTemplateGate;
