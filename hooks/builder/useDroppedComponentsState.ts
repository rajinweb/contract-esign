"use client";
import { useCallback, useMemo, useState } from 'react';
import { DocumentField, DocumentFieldType, DroppedComponent } from '@/types/types';
import { dedupeFieldsById, mapFieldToDroppedComponent } from '@/utils/builder/documentFields';
import { getFieldTypeFromComponentLabel } from '@/lib/api';

interface UseDroppedComponentsStateArgs {
  isSigningMode: boolean;
  initialFields: DocumentField[] | null;
  onFieldsChange?: (fields: DocumentField[]) => void;
}

export const useDroppedComponentsState = ({
  isSigningMode,
  initialFields,
  onFieldsChange,
}: UseDroppedComponentsStateArgs) => {
  const [internalDroppedComponents, setInternalDroppedComponents] = useState<DroppedComponent[]>([]);

  const signingComponents: DroppedComponent[] = useMemo(() => {
    if (!initialFields) return [];
    const usedIds = new Set<number>();
    const normalizedFields = dedupeFieldsById(initialFields);
    return normalizedFields.map((field: DocumentField) =>
      mapFieldToDroppedComponent(field, usedIds)
    );
  }, [initialFields]);

  const droppedComponents: DroppedComponent[] = useMemo(() => {
    if (isSigningMode) {
      return signingComponents;
    }
    return internalDroppedComponents;
  }, [isSigningMode, signingComponents, internalDroppedComponents]);

  const setDroppedComponents = useCallback((updater: React.SetStateAction<DroppedComponent[]>) => {
    if (isSigningMode && onFieldsChange) {
      const newFields = typeof updater === 'function' ? updater(signingComponents) : updater;
      onFieldsChange(newFields.map(comp => ({
        id: comp.fieldId ?? String(comp.id),
        type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        pageNumber: comp.pageNumber as number,
        recipientId: comp.assignedRecipientId,
        required: comp.required !== undefined ? comp.required : true,
        value: comp.data || '',
        placeholder: comp.placeholder,
        mimeType: comp.mimeType,
        pageRect: comp.pageRect,
        fieldOwner: comp.fieldOwner,
      })));
      return;
    }
    setInternalDroppedComponents(updater);
  }, [isSigningMode, onFieldsChange, signingComponents]);

  return {
    droppedComponents,
    setDroppedComponents,
    internalDroppedComponents,
  };
};
