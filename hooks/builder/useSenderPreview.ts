"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { getFieldTypeFromComponentLabel } from '@/lib/api';
import {
  Doc,
  DocumentField,
  DroppedComponent,
  Recipient,
  SigningViewDocument,
} from '@/types/types';

interface UseSenderPreviewArgs {
  selectedFile: File | string | Doc | null;
  initialFileUrl?: string | null;
  droppedComponents: DroppedComponent[];
  recipients: Recipient[];
  documentId: string | null;
  documentName: string;
  initialDocumentName?: string | null;
  documentStatus: string | null;
  currentPage: number;
  onPreviewError?: (message: string) => void;
}

const toPreviewFields = (
  components: DroppedComponent[],
  currentPage: number
): DocumentField[] =>
  components.map((component) => ({
    id: component.fieldId ?? String(component.id),
    type: getFieldTypeFromComponentLabel(component.component) as DocumentField['type'],
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height,
    pageNumber: component.pageNumber ?? currentPage,
    recipientId: component.assignedRecipientId,
    required: component.required !== false,
    value: component.data ?? '',
    placeholder: component.placeholder,
    mimeType: component.mimeType,
    pageRect: component.pageRect,
    fieldOwner: component.fieldOwner,
  }));

const normalizeRecipients = (recipients: Recipient[]): Recipient[] =>
  recipients.map((recipient, index) => ({
    ...recipient,
    status: recipient.status ?? 'pending',
    order: typeof recipient.order === 'number' ? recipient.order : index + 1,
  }));

const pickPreviewRecipient = (
  fields: DocumentField[],
  recipients: Recipient[]
): Recipient | null => {
  const fieldCountByRecipient = new Map<string, number>();
  fields.forEach((field) => {
    if (!field.recipientId) return;
    fieldCountByRecipient.set(
      field.recipientId,
      (fieldCountByRecipient.get(field.recipientId) ?? 0) + 1
    );
  });

  return (
    recipients.find((recipient) => {
      if (recipient.isCC || recipient.role === 'viewer') return false;
      return (fieldCountByRecipient.get(recipient.id) ?? 0) > 0;
    }) ??
    recipients.find((recipient) => !recipient.isCC && recipient.role !== 'viewer') ??
    recipients.find((recipient) => (fieldCountByRecipient.get(recipient.id) ?? 0) > 0) ??
    recipients[0] ??
    null
  );
};

export const useSenderPreview = ({
  selectedFile,
  initialFileUrl = null,
  droppedComponents,
  recipients,
  documentId,
  documentName,
  initialDocumentName = null,
  documentStatus,
  currentPage,
  onPreviewError,
}: UseSenderPreviewArgs) => {
  const [isSenderPreviewOpen, setIsSenderPreviewOpen] = useState(false);
  const [senderPreviewDocument, setSenderPreviewDocument] =
    useState<SigningViewDocument | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const resolvePreviewFileUrl = useCallback((): string | null => {
    if (typeof selectedFile === 'string') {
      return selectedFile;
    }
    if (
      selectedFile &&
      typeof selectedFile === 'object' &&
      'fileUrl' in selectedFile &&
      typeof selectedFile.fileUrl === 'string'
    ) {
      return selectedFile.fileUrl;
    }
    if (selectedFile instanceof File) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = URL.createObjectURL(selectedFile);
      return previewObjectUrlRef.current;
    }
    return initialFileUrl;
  }, [initialFileUrl, selectedFile]);

  const openSenderPreview = useCallback(() => {
    const fileUrl = resolvePreviewFileUrl();
    if (!fileUrl) {
      onPreviewError?.('No document file available to preview.');
      return;
    }

    const previewFields = toPreviewFields(droppedComponents, currentPage);
    const previewRecipients = normalizeRecipients(recipients);
    const previewRecipient = pickPreviewRecipient(previewFields, previewRecipients);

    setSenderPreviewDocument({
      id: documentId ?? 'preview-document',
      fileUrl,
      name: documentName || initialDocumentName || 'Document Preview',
      fields: previewFields,
      recipients: previewRecipients,
      currentRecipientId: previewRecipient?.id,
      currentRecipient: previewRecipient ?? undefined,
      status: documentStatus ?? 'sent',
    });
    setIsSenderPreviewOpen(true);
  }, [
    currentPage,
    documentId,
    documentName,
    documentStatus,
    droppedComponents,
    initialDocumentName,
    onPreviewError,
    recipients,
    resolvePreviewFileUrl,
  ]);

  const closeSenderPreview = useCallback(() => {
    setIsSenderPreviewOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  return {
    isSenderPreviewOpen,
    senderPreviewDocument,
    openSenderPreview,
    closeSenderPreview,
  };
};
