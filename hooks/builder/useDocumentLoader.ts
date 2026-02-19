"use client";
import { useEffect } from 'react';
import { Doc, DocumentField, DroppedComponent, IDocument, Recipient } from '@/types/types';
import { dedupeFieldsById, mapFieldToDroppedComponent } from '@/utils/builder/documentFields';
import { buildDraftKey } from '@/utils/builder/documentDraft';
import { buildTemplateRecipients } from '@/lib/template-recipients';

interface UseDocumentLoaderArgs {
  propDocumentId: string | null;
  initialRecipients: Recipient[] | null;
  initialFileUrl: string | null;
  initialDocumentName: string | null;
  isSigningMode: boolean;
  isTemplateEditor?: boolean;
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
  isTemplateEditor = false,
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
    if (isTemplateEditor && initialFileUrl) return;

    const loadDocument = async () => {
      if (isSigningMode) {
        return;
      }
      try {
        if (!/^[a-f\d]{24}$/i.test(currentDocId)) {
          if (typeof window !== 'undefined') {
            window.location.replace('/404');
          }
          return;
        }

        const headers: Record<string, string> = {};
        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        if (isTemplateEditor) {
          const loadUrl = new URL('/api/templates/load', window.location.origin);
          loadUrl.searchParams.set('id', currentDocId);

          const response = await fetch(`${loadUrl.pathname}${loadUrl.search}`, {
            cache: 'no-store',
            credentials: 'include',
            headers,
          });

          if (!response.ok) {
            if (response.status === 404) {
              window.location.replace('/404');
              return;
            }
            if (response.status === 401) {
              window.location.replace('/login');
              return;
            }
            if (response.status === 403) {
              window.location.replace('/templates?view=my');
              return;
            }
            throw new Error(`Failed to fetch template (${response.status})`);
          }

          const payload = await response.json();
          const template = payload?.template;
          const normalizedTemplateFields = dedupeFieldsById(template?.fields || []);
          const usedIds = new Set<number>();
          const mappedFields: DroppedComponent[] = normalizedTemplateFields.map((field: DocumentField) =>
            mapFieldToDroppedComponent(field, usedIds)
          );
          const normalizedRecipients = buildTemplateRecipients(
            currentDocId,
            template?.defaultSigners || [],
            normalizedTemplateFields
          ) as Recipient[];
          const nextTemplateName = template?.name || '';

          setDroppedComponents(mappedFields);
          setRecipients(normalizedRecipients);
          setDocumentName(nextTemplateName);
          const maxId = Math.max(0, ...mappedFields.map(c => c.id));
          setElementId(maxId + 1);
          resetHistory(mappedFields);
          markSavedState({
            components: mappedFields,
            name: nextTemplateName,
            recipients: normalizedRecipients,
          });

          const templateResourceId = template?.templateId || currentDocId;
          setSelectedFile(`/api/templates/${encodeURIComponent(templateResourceId)}`);
          return;
        }

        const guestIdFromQuery =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('guestId')
            : null;
        const guestIdFromStorage =
          typeof window !== 'undefined'
            ? localStorage.getItem('guest_session_id')
            : null;
        const safeGuestIdFromQuery =
          typeof guestIdFromQuery === 'string' && guestIdFromQuery.startsWith('guest_')
            ? guestIdFromQuery
            : null;
        const safeGuestIdFromStorage =
          typeof guestIdFromStorage === 'string' && guestIdFromStorage.startsWith('guest_')
            ? guestIdFromStorage
            : null;

        const fetchDocument = async (guestId: string | null) => {
          const loadUrl = new URL('/api/documents/load', window.location.origin);
          loadUrl.searchParams.set('id', currentDocId);
          if (guestId) {
            loadUrl.searchParams.set('guestId', guestId);
          }
          return fetch(`${loadUrl.pathname}${loadUrl.search}`, {
            cache: 'no-store',
            credentials: 'include',
            headers,
          });
        };

        let response = await fetchDocument(null);
        let resolvedGuestId: string | null = null;

        if (!response.ok) {
          const fallbackGuestIds = [safeGuestIdFromQuery, safeGuestIdFromStorage].filter(
            (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index
          );

          for (const guestId of fallbackGuestIds) {
            response = await fetchDocument(guestId);
            if (response.ok) {
              resolvedGuestId = guestId;
              break;
            }
          }
        }

        if (!response.ok) {
          if (response.status === 404) {
            if (typeof window !== 'undefined') {
              window.location.replace('/404');
            }
            return;
          }
          throw new Error(`Failed to fetch document (${response.status})`);
        }

        if (resolvedGuestId && typeof window !== 'undefined') {
          localStorage.setItem('guest_session_id', resolvedGuestId);
        }

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
          const fileUrl = resolvedGuestId
            ? `/api/documents/${encodeURIComponent(doc.documentId)}?guestId=${encodeURIComponent(resolvedGuestId)}`
            : `/api/documents/${encodeURIComponent(doc.documentId)}`;
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
    initialFileUrl,
    isSigningMode,
    isTemplateEditor,
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
