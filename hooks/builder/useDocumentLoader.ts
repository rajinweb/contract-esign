"use client";
import { useEffect } from 'react';
import { Doc, DocumentField, DroppedComponent, IDocument, Recipient } from '@/types/types';
import { dedupeFieldsById, mapFieldToDroppedComponent } from '@/utils/builder/documentFields';
import { buildDraftKey } from '@/utils/builder/documentDraft';

interface UseDocumentLoaderArgs {
  propDocumentId: string | null;
  initialRecipients: Recipient[] | null;
  initialFileUrl: string | null;
  initialDocumentName: string | null;
  isSigningMode: boolean;
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>;
  setSelectedFile: (value: File | string | Doc | null) => void;
  setDocumentName: React.Dispatch<React.SetStateAction<string>>;
  setDocumentId: React.Dispatch<React.SetStateAction<string | null>>;
  setDocumentStatus: React.Dispatch<React.SetStateAction<string | null>>;
  setDerivedFromDocumentId: React.Dispatch<React.SetStateAction<string | null>>;
  setDerivedFromVersion: React.Dispatch<React.SetStateAction<number | null>>;
  setSigningEvents: React.Dispatch<React.SetStateAction<NonNullable<IDocument['signingEvents']>>>;
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  resetHistory: (newState: DroppedComponent[]) => void;
  setElementId: React.Dispatch<React.SetStateAction<number>>;
  markSavedState: (state: { components: DroppedComponent[]; name: string; recipients: Recipient[] }) => void;
}

export const useDocumentLoader = ({
  propDocumentId,
  initialRecipients,
  initialFileUrl,
  initialDocumentName,
  isSigningMode,
  setRecipients,
  setSelectedFile,
  setDocumentName,
  setDocumentId,
  setDocumentStatus,
  setDerivedFromDocumentId,
  setDerivedFromVersion,
  setSigningEvents,
  setDroppedComponents,
  resetHistory,
  setElementId,
  markSavedState,
}: UseDocumentLoaderArgs) => {
  useEffect(() => {
    if (initialRecipients && Array.isArray(initialRecipients) && initialRecipients.length) {
      setRecipients(initialRecipients);
    }
    if (initialFileUrl) {
      setSelectedFile(initialFileUrl);
    }
    if (initialDocumentName) setDocumentName(initialDocumentName);
    if (propDocumentId) setDocumentId(propDocumentId);
  }, [
    propDocumentId,
    initialFileUrl,
    initialDocumentName,
    initialRecipients,
    setSelectedFile,
    setDocumentName,
    setDocumentId,
    setRecipients,
  ]);

  useEffect(() => {
    const currentDocId = propDocumentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
    if (!currentDocId) return;

    const loadDocument = async () => {
      if (isSigningMode) {
        return;
      }
      try {
        const headers: Record<string, string> = {};
        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`/api/documents/load?id=${currentDocId}`, {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });

        if (!response.ok) throw new Error('Failed to fetch document');

        const data = await response.json();
        const doc = data.document;
        setDocumentStatus(doc?.status ?? null);
        setDerivedFromDocumentId(doc?.derivedFromDocumentId ?? null);
        setDerivedFromVersion(
          typeof doc?.derivedFromVersion === 'number' ? doc.derivedFromVersion : null
        );
        setSigningEvents(Array.isArray(doc?.signingEvents) ? doc.signingEvents : []);

        const usedIds = new Set<number>();
        const serverSourceFields = dedupeFieldsById(doc?.fields || []);
        const serverFields: DroppedComponent[] = serverSourceFields.map((field: DocumentField) =>
          mapFieldToDroppedComponent(field, usedIds)
        );

        const rawDraft = typeof window !== 'undefined'
          ? sessionStorage.getItem(buildDraftKey(currentDocId))
          : null;
        const draftFields: DroppedComponent[] = rawDraft
          ? dedupeFieldsById(JSON.parse(rawDraft).fields || []).map((field: DocumentField) =>
              mapFieldToDroppedComponent(field, usedIds)
            )
          : [];

        const restoredFields = [...serverFields];
        draftFields.forEach(draftField => {
          const index = restoredFields.findIndex(serverField => {
            if (draftField.fieldId && serverField.fieldId) {
              return serverField.fieldId === draftField.fieldId;
            }
            return serverField.id === draftField.id;
          });
          if (index !== -1) {
            const serverField = restoredFields[index];
            if (serverField.data && !draftField.data) {
              draftField.data = serverField.data;
            }
            restoredFields[index] = draftField;
          } else {
            restoredFields.push(draftField);
          }
        });

        const nextDocumentName = doc?.documentName || doc?.originalFileName || '';

        setDroppedComponents(restoredFields);
        setRecipients(doc?.recipients || []);
        setDocumentName(nextDocumentName);
        const maxId = Math.max(0, ...restoredFields.map(c => c.id));
        setElementId(maxId + 1);
        resetHistory(restoredFields);

        markSavedState({
          components: restoredFields,
          name: nextDocumentName,
          recipients: doc?.recipients || [],
        });

        if (doc?.documentId) {
          const fileUrl = `/api/documents/${encodeURIComponent(doc.documentId)}`;
          setSelectedFile(fileUrl);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        setSelectedFile(null);
      }
    };

    loadDocument();
  }, [
    propDocumentId,
    isSigningMode,
    setSelectedFile,
    setDocumentStatus,
    setDerivedFromDocumentId,
    setDerivedFromVersion,
    setSigningEvents,
    setDroppedComponents,
    setRecipients,
    setDocumentName,
    resetHistory,
    setElementId,
    markSavedState,
  ]);
};
