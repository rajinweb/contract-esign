"use client";
import React, { useEffect, useState, useRef, MouseEvent, ChangeEvent, useCallback, useMemo} from 'react';
import dynamic from 'next/dynamic';

// Third-party
import { pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { DraggableData } from 'react-rnd';
import { initializePdfWorker } from '@/utils/pdfjsSetup';

// Project utils & types
import { areDroppedComponentsEqual, areRecipientsEqual } from '@/utils/comparison';
import { DroppingField, DroppedComponent, Recipient, HandleSavePDFOptions, DocumentField, DocumentFieldType, FieldOwner } from '@/types/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';


// Components
import UploadZone from "@/components/UploadZone";
import Fields from '@/components/builder/Fields';
import useContextStore from '@/hooks/useContextStore';
import { LivePhotoDialog } from "@/components/builder/LivePhotoDialog";
import UserItems from '@/components/builder/UserItems';
import Modal from '../Modal';
import AddRecipientModal from './AddRecipientModal';
import SendDocumentModal from './SendDocumentModal';
import ActionToolBar from '@/components/builder/ActionToolBar';
import SaveAsTemplateModal from '@/components/SaveAsTemplateModal';
import PageThumbnailMenu from '@/components/builder/PageThumbnailMenu';
import PageThumbnails from './PageThumbnails';
import PDFViewer from './PDFViewer';
import DroppedComponents from './DroppedComponents';
import Footer from './Footer';
import RecipientsList from './RecipientsList';
import toast from 'react-hot-toast';
import {loadPdf, sanitizeFileName, blobToURL, mergeFieldsIntoPdf, savePdfBlob, downloadPdf} from '@/lib/pdf';
import {uploadToServer, getFieldTypeFromComponentLabel} from '@/lib/api';
import DeletedDocumentDialog from './DeletedDocumentDialog';
import { useSignatureInitial } from '@/hooks/useSignatureInitial';
import RecipientItems from './RecipientItems';
const LoginPage = dynamic(() => import('@/app/login/page'), { ssr: false });

export interface EditorProps {
  // Prefer resourceId going forward, but keep documentId for backward compatibility
  resourceId?: string | null;
  documentId?: string | null;
  initialFileUrl?: string | null;
  initialResourceName?: string | null;
  initialFields?: DocumentField[] | null;
  initialRecipients?: Recipient[] | null;
  isSigningMode?: boolean;
  isSigned?: boolean;
  onPageChange?: (page: number) => void;
  onNumPagesChange?: (numPages: number) => void;
  onSignedSaveDocument?: (saveFn: () => Promise<void>) => void;
  signingToken?: string;
  currentRecipientId?: string;
  onFieldsChange?: (fields: DocumentField[]) => void;
  isTemplateEditor?: boolean; // New prop to differentiate
}

// Initialize PDF worker (centralized setup)
initializePdfWorker(pdfjs);

const DocumentEditor: React.FC<EditorProps> = ({
  resourceId,
  documentId: documentIdProp,
  initialFileUrl = null,
  initialResourceName: initialDocumentName = null,
  initialFields = null,
  initialRecipients = null,
  isSigningMode = false,
  isSigned = false,
  onPageChange,
  onNumPagesChange,
  onSignedSaveDocument,
  signingToken,
  currentRecipientId,
  onFieldsChange,
}) => {
  // Support both legacy documentId prop and new resourceId prop
  const propDocumentId = resourceId ?? documentIdProp ?? null;
  // ========= Context =========
  const { selectedFile, setSelectedFile, isLoggedIn, showModal, setShowModal, user, setUser } = useContextStore();

  // ========= PDF State =========
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // ========= Page Menu =========
  const [showMenu, setShowMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [menuTriggerElement, setMenuTriggerElement] = useState<HTMLElement | null>(null);

  // ========= Drag & Drop =========
  const [isDragging, setIsDragging] = useState(false);
  const [draggingComponent, setDraggingComponent] = useState<DroppingField | null>(null);
  const [internalDroppedComponents, setInternalDroppedComponents] = useState<DroppedComponent[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);

  // ========= UI State =========
  const [error, setError] = useState<string | null>(null);
  const [photoDialog, setPhotoDialog] = useState<boolean>(false);
  const [canvasFields, setCanvasFields] = useState<boolean>(false)
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [selectedFieldForDialog, setSelectedFieldForDialog] = useState<DroppedComponent | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [autoDate, setAutoDate] = useState<boolean>(true);
  const [documentName, setDocumentName] = useState<string>('');
  const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);
  const [lastSavedState, setLastSavedState] = useState<{
  components: DroppedComponent[];
  name: string;
  recipients: Recipient[];
} | null>(null);
  // ========= Recipients State =========
  const [showAddRecipients, setShowAddRecipients] = useState<boolean>(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showSendDocument, setShowSendDocument] = useState<boolean>(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const loadPdfForEditing = async () => {
      if (selectedFile) {
        try {
          const pdfDoc = await loadPdf(selectedFile as File | string);
          setPdfDoc(pdfDoc);
        } catch (err) {
          console.error("Error loading PDF for menu operations:", err);
          // We can silently fail here, as this only affects menu operations
        }
      } else {
        setPdfDoc(null);
      }
    };
    loadPdfForEditing();
  }, [selectedFile]);

  const handleAddRecipients = useCallback(() => {
    setShowAddRecipients(true);
  }, []);
  // ========= Refs =========
  const documentRef = useRef<HTMLDivElement | null>(null);
  const draggingEle = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textFieldRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // In signing mode, DocumentEditor is a controlled component.
  // It gets its fields from props and calls `onFieldsChange` to update them.
  const droppedComponents: DroppedComponent[] = useMemo(() => {
    if (isSigningMode && initialFields) {
      return initialFields.map((field: DocumentField) => ({
        id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
        component: (String(field.type || ''))
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        pageNumber: field.pageNumber,
        data: field.value,
        assignedRecipientId: field.recipientId,
        required: field.required !== false,
        placeholder: field.placeholder,
        pageRect:field.pageRect,
        fieldOwner:field.fieldOwner
      } as DroppedComponent));
    }
    return internalDroppedComponents;
  }, [isSigningMode, initialFields, internalDroppedComponents]);

  const setDroppedComponents = useCallback((updater: React.SetStateAction<DroppedComponent[]>) => {
    if (isSigningMode && onFieldsChange) {
      const newFields = typeof updater === 'function' ? updater(droppedComponents) : updater;
      onFieldsChange(newFields.map(comp => ({ id: String(comp.id), type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType, x: comp.x, y: comp.y, width: comp.width, height: comp.height, pageNumber: comp.pageNumber as number, recipientId: comp.assignedRecipientId, required: comp.required !== undefined ? comp.required : true, value: comp.data || '', placeholder: comp.placeholder, mimeType: comp.mimeType, pageRect: comp.pageRect, fieldOwner:comp.fieldOwner })));
    } else {
      setInternalDroppedComponents(updater);
    }
  }, [isSigningMode, onFieldsChange, droppedComponents]);

  const { defaults, setDefault } = useSignatureInitial({
    user,
    setUser,
    droppedComponents,
    updateComponentData: (id, data) => setDroppedComponents(prev => prev.map(comp => comp.id === id ? { ...comp, data: data.value } : comp))
  });
  // ========= Undo/Redo =========
  const { saveState, undo, redo, canUndo, canRedo, resetHistory } = useUndoRedo(internalDroppedComponents);



  // If the route passed initial props (prefetch), seed state from them on mount
  useEffect(() => {
    if (initialRecipients && Array.isArray(initialRecipients) && initialRecipients.length) {
      setRecipients(initialRecipients);
    }
    if (initialFileUrl) {
      setSelectedFile(initialFileUrl);
    }
    if (initialDocumentName) setDocumentName(initialDocumentName);
    if (propDocumentId) setDocumentId(propDocumentId);
  
  }, [propDocumentId, initialFileUrl, initialDocumentName, initialRecipients, setSelectedFile]);

  // --- Draft autosave (sessionStorage) ---
  const draftKey = (id: string | null | undefined) => `doc-draft:${id || 'unknown'}`;

  useEffect(() => {
    const currentDocId = propDocumentId || localStorage.getItem('currentDocumentId');
    if (!currentDocId) return;
  
    const loadDocument = async () => {
      if (isSigningMode) {
        return;
      }
      try {
        // Load server document
        const token = localStorage.getItem('AccessToken');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
  
        const response = await fetch(`/api/documents/load?id=${currentDocId}`, {
          headers: Object.keys(headers).length ? headers : undefined,
          cache: 'no-store',
        });
  
        if (!response.ok) throw new Error('Failed to fetch document');
  
        const data = await response.json();
        const doc = data.document;
  
        // Server fields
        const serverFields: DroppedComponent[] = (doc?.fields || []).map((field:DocumentField) => ({
          id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
          component: (String(field.type || ''))
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          pageNumber: field.pageNumber,
          data: field.value,
          assignedRecipientId: field.recipientId,
          required: field.required !== false,
          placeholder: field.placeholder,
          fieldOwner:field.fieldOwner
        }));
  
        // Restore draft if exists
        const rawDraft = sessionStorage.getItem(draftKey(currentDocId));
        const draftFields: DroppedComponent[] = rawDraft
          ? JSON.parse(rawDraft).fields.map((field:DocumentField) => ({
              id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
              component: (String(field.type || ''))
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
              x: field.x,
              y: field.y,
              width: field.width,
              height: field.height,
              pageNumber: field.pageNumber,
              data: field.value,
              assignedRecipientId: field.recipientId,
              required: field.required !== false,
              placeholder: field.placeholder,
              fieldOwner:field.fieldOwner
            }))
          : [];
  
        // Merge draft on top of server fields, preserving server values if draft is empty.
        const restoredFields = [...serverFields];
        draftFields.forEach(draftField => {
          const index = restoredFields.findIndex(serverField => serverField.id === draftField.id);
          if (index !== -1) {
            const serverField = restoredFields[index];
            // If the server has a value and the draft doesn't, keep the server value.
            if (serverField.data && !draftField.data) {
                draftField.data = serverField.data;
            }
            restoredFields[index] = draftField;
          } else {
            restoredFields.push(draftField);
          }
        });
  
        setDroppedComponents(restoredFields);
        setRecipients(doc?.recipients || []);
        setDocumentName(doc?.documentName || doc?.originalFileName || '');
        const maxId = Math.max(0, ...restoredFields.map(c => c.id));
        setElementId(maxId + 1);
        resetHistory(restoredFields);
  
        setLastSavedState({
          components: restoredFields,
          name: doc?.documentName || doc?.originalFileName || '',
          recipients: doc?.recipients || [],
        });

        if (doc?.documentId) {
          const fileUrl = `/api/documents/${encodeURIComponent(doc.documentId)}`;
          setSelectedFile(fileUrl);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        // Clear any stale selected file so metadata fetcher doesn't keep hitting a 404
        setSelectedFile(null);
      }
    };
  
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propDocumentId, isSigningMode]);

useEffect(() => {
  if (!documentId) return;

  const timeout = setTimeout(() => {
    const payload = {
      fields: droppedComponents.map(c => ({
        id: c.id?.toString(),
        type: getFieldTypeFromComponentLabel(c.component || ''),
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        pageNumber: c.pageNumber,
        recipientId: c.assignedRecipientId,
        required: c.required,
        value: c.data,
        placeholder: c.placeholder,
        fieldOwner: c.fieldOwner,
      })),
      recipients,
      documentName,
      fileUrl: typeof selectedFile === 'string' ? selectedFile : null,
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(draftKey(documentId), JSON.stringify(payload));
  }, 800);

  return () => clearTimeout(timeout);
}, [droppedComponents, recipients, documentName, selectedFile, documentId]);

  // ==========================================================
  // Undo/Redo Functions
  // ==========================================================
  const handleUndo = useCallback((): void => {
    const previousState = undo();
    if (previousState) {
      setDroppedComponents(previousState);
    }
  }, [undo, setDroppedComponents]);

  const handleRedo = useCallback((): void => {
    const nextState = redo();
    if (nextState) {
      setDroppedComponents(nextState);
    }
  }, [redo, setDroppedComponents]);

  // ==========================================================
  // PDF & Page Handling
  // ==========================================================
  const generateThumbnails = (numPages: number) => {
    setPages(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const handleThumbnailClick = (pageNum: number) => {
    setCurrentPage(pageNum);
    const page = documentRef.current?.querySelector(`[data-page-number="${pageNum}"]`);
    page?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  };

  const insertBlankPageAt = async (index: number) => {
    if (!pdfDoc) return;
    pdfDoc.insertPage(index); // A4 size is default for new pages

    await handlePdfUpdated(pdfDoc);
    setDroppedComponents([]);
    resetHistory([]);
  };

  const handlePdfUpdated = async (updatedDoc: PDFDocument) => {
    try {
      const bytes = await updatedDoc.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = await blobToURL(blob);

      setSelectedFile(url);
      setPdfDoc(updatedDoc);
      generateThumbnails(updatedDoc.getPageCount());
    } catch (err) {
      console.error("handlePdfUpdated failed:", err);
    }
  };

  // ==========================================================
  // Drag & Drop
  // ==========================================================
  const handleDragStart = () => {
    document.body.classList.add('dragging-no-select');
  };

  const mouseDownOnField = (component: string, e: MouseEvent<HTMLDivElement>, fieldOwner:FieldOwner) => {
    const xy = { x: e.clientX, y: e.clientY };
    let data: string | undefined = undefined;
    if(fieldOwner === 'me') {
      if(component === 'Full Name') {
        data = user?.name;
      }
      if(component === 'Email') {
        data = user?.email;
      }
      if(component === 'Initials') {
        data = defaults.initial?.value || user?.name?.split(' ').map(n => n[0]).join('').toUpperCase();
      } else if (component === 'Signature') { // Add this block for Signature component
        data = defaults.signature?.value;
      }
      if(component === 'Date') {
        data = new Date().toISOString().split('T')[0];
      }
    }
    setDraggingComponent({ component, ...xy, fieldOwner, data: data || null });
    setPosition(xy);
    handleDragStart();
  };  

  const mouseMoveOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingComponent && draggingEle.current) {
      draggingEle.current.style.display = 'block';
      setPosition({ x: e.clientX - 65, y: e.clientY });
    }
  };

  const clickOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
      if(isSigningMode){
      return
     }
    if (!draggingComponent || e.target instanceof HTMLElement && e.target.closest('.react-draggable') || e.target instanceof HTMLElement && e.target?.closest('.page-brake')) return;

    // Clear field selection when clicking on empty area
    setSelectedFieldId(null);

    const rect = documentRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Calculate the page number for the dropped component
    let targetPageNumber = currentPage;
    const dropY = e.clientY;
    let pageRect: DOMRect| null = null;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;
      
      pageRect = pageEl.getBoundingClientRect();
      if (dropY >= pageRect.top && dropY <= pageRect.bottom) {
        targetPageNumber = i + 1;
        break;
      }
    }
    const newComponent: DroppedComponent = {
      id: elementId,
      component: draggingComponent.component,
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
      width: 100,
      height: 50,
      pageNumber: targetPageNumber,
      pageRect: pageRect,
      fieldOwner:draggingComponent.fieldOwner,
      data: draggingComponent.data
    };

    setDroppedComponents((prev) => {
      const newComponents = [...prev, newComponent].map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
    setElementId((id) => id + 1);
  };

  const handleDeleteField = (item: DroppedComponent) => {
    setDroppedComponents((prev) => {
      const newComponents = prev.filter((c) => c.id !== item.id);
      saveState(newComponents);
      return newComponents;
    });
    setSelectedFieldId(null);
  };

  const handleDuplicateField = (item: DroppedComponent) => {
    const newComponent: DroppedComponent = {
      ...item,
      id: elementId,
      x: item.x + 20,
      y: item.y + 20,
      assignedRecipientId: item.assignedRecipientId
    };

    setDroppedComponents((prev) => {
      const newComponents = [...prev, newComponent].map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
    setElementId((id) => id + 1);
    setSelectedFieldId(newComponent.id);
  };

  const handleAssignRecipient = useCallback((fieldId: number, recipientId: string | null) => {
    setDroppedComponents((prevComponents) => {
      let previousRecipientId: string | null | undefined;
      const newComponents = prevComponents.map((c) => {
        if (c.id === fieldId) {
          previousRecipientId = c.assignedRecipientId;
          const recipient = recipients.find(r => r.id === recipientId);
          let data = c.data;
          if (c.component === 'Email' && recipient) {
            data = recipient.email;
          }
          return { ...c, assignedRecipientId: recipientId, data };
        }
        return c;
      });

      setRecipients((prevRecipients) =>
        prevRecipients.map((r) => {
          const assignedCount = newComponents.filter(
            (c) => c.assignedRecipientId === r.id
          ).length;

          const shouldResetStatus =
            recipientId !== null &&
            r.id === recipientId &&
            r.status === 'signed' || r.status === 'approved' &&
            previousRecipientId !== recipientId;

          if (shouldResetStatus) {
            // If recipient status is reset, preserve existing field data
            return {
              ...r,
              totalFields: assignedCount,
              status: 'pending',
            };
          }

          return {
            ...r,
            totalFields: assignedCount,
            status: r.status,
          };
        })
      );

      // Preserve data of existing fields when a new field is assigned to a signed recipient
      const finalComponents = newComponents.map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && (recipient.status === 'signed' || recipient.status === 'approved')) {
          const prevComponent = prevComponents.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });

      saveState(finalComponents);
      return finalComponents;
    });
  }, [saveState, setDroppedComponents, recipients]);

  const handleDragStop = (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => {
    document.body.classList.remove('dragging-no-select');
    if ((e.target as HTMLElement).closest('.delete-button-wrapper')) {
      return;
    }

    if (data.x === item.x && data.y === item.y) {
      return;
    }

    e.stopPropagation();
    if (!documentRef.current) return;

  const parentRect = documentRef.current.getBoundingClientRect();
  const scrollY = window.scrollY;

  const fieldTopAbs = data.y + parentRect.top + scrollY;
  const fieldBottomAbs = fieldTopAbs + item.height;

  let newY = data.y;
  let newPageNumber = item.pageNumber;
  let pageRect: DOMRect | null = null;
  // Check each page
  for (let i = 0; i < pageRefs.current.length; i++) {
    const pageEl = pageRefs.current[i];
    if (!pageEl) continue;

    pageRect = pageEl.getBoundingClientRect();
    const pageTopAbs = pageRect.top + scrollY;
    const pageBottomAbs = pageTopAbs + pageRect.height;

    if (fieldTopAbs >= pageTopAbs && fieldBottomAbs <= pageBottomAbs) {
      // Fully inside this page -> no snapping
      newY = data.y;
      newPageNumber = i + 1;
      break;
    }

    if (fieldBottomAbs > pageTopAbs && fieldTopAbs < pageBottomAbs) {
      // Intersecting page break -> snap to nearest edge
      const distToTop = Math.abs(fieldTopAbs - pageTopAbs);
      const distToBottom = Math.abs(fieldBottomAbs - pageBottomAbs);

      if (distToTop < distToBottom) {
        newY = pageTopAbs - parentRect.top + 1; // snap to top
      } else {
        newY = pageBottomAbs - item.height - parentRect.top - 1; // snap to bottom
      }
      newPageNumber = i + 1;
      break;
    }
  }

  // Update state
  setDroppedComponents(prev =>{
      const newComponents = prev.map(c =>
      c.id === item.id
        ? { ...c, x: data.x, y: newY, pageNumber: newPageNumber, pageRect: pageRect }
        : c
      );
      saveState(newComponents);
      return newComponents;
    }
  );
};

  const handleResizeStop = (e: MouseEvent | TouchEvent, item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number, y: number }) => {
    document.body.classList.remove('dragging-no-select');
    e.stopPropagation();
    setDroppedComponents((prev) => {
      const newComponents = prev.map((c) =>
        c.id === item.id ? { ...c, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : c
      );
      saveState(newComponents);
      return newComponents;
    });
  };

  // ==========================================================
  // Effects
  // ==========================================================

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // initialize lastSavedName on mount from current documentName
    lastSavedNameRef.current = documentName || null;

    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleUndo, handleRedo]);

  const saveToServer = useCallback(async (): Promise<boolean> => {
    if (!selectedFile || !pdfDoc) return false;

    try {
      // Save as blob
      const blob = await savePdfBlob(pdfDoc);
      const safeName = sanitizeFileName(documentName);
      // prefer the documentId stored in component state (set when editor loaded) otherwise fallback to localStorage
      const currentdoc = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
      console.log('droppedComponents before save', droppedComponents);
      // Upload to server; pass sessionId so server knows if this is same session (and will overwrite) or a new session (and will create new version)
      const result = await uploadToServer(blob, safeName, currentPage, droppedComponents, recipients, currentdoc, setDocumentId, setDocumentName, setSelectedFile, sessionId, signingToken, false);
      if (result && result.documentId) {
        setDocumentId(result.documentId);
      }
      setLastSavedState({
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
  }, [selectedFile, documentName, currentPage, droppedComponents, recipients, documentId, setDocumentId, setDocumentName, setSelectedFile, signingToken, setLastSavedState, pdfDoc]);

  //File Handling
  const handleSavePDF = async ({
    isServerSave = false,
    isDownload = false,
    isMergeFields = false,
  }: HandleSavePDFOptions): Promise<boolean | null> => {

    if (!isLoggedIn) {
      setShowModal(true);
      return null;
    }

    if (!selectedFile || !pdfDoc) {
      console.error("No file selected!");
      return null;
    }
    if(isServerSave){
      return await saveToServer();
    }

    const canvas = documentRef.current;
    const canvasRect = canvas?.getBoundingClientRect();
    if (!canvasRect) return null;  

    try {
        // Load and merge
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
        if (isDownload && !isMergeFields){
          downloadPdf(blob, safeName);
        }
        // Cleanup
        if (isDownload){
          setPosition({ x: 0, y: 0 });
          setDroppedComponents([]);
          resetHistory([]);
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
  };

  // Drag & Drop Helpers
  const mouseLeaveOnDropArea = () => {
    document.body.classList.remove('dragging-no-select');
    if (draggingEle.current) {
      draggingEle.current.style.display = 'none';
    }
  };

  const clickField = (event: MouseEvent, item: DroppedComponent) => {
    event.stopPropagation(); // prevent parent clicks (like drop area)
    // Set the currently selected component
    setDraggingComponent(item);

    if(!isSigningMode && item.fieldOwner == 'recipients'){
      return
    }
    if (isDragging) {
      setIsDragging(false);
      return; // ignore click while dragging
    }
    
    // Handle component-specific actions
    switch (item.component) {
      case "Image":
        setSelectedFieldForDialog(item);
        imageRef.current?.click(); // trigger file input
        break;
      case "Stamp":
      case "Signature":
      case "Initials":
        setSelectedFieldForDialog(item); // Set the field for which initials are being added
        setCanvasFields(true); 
        break;
      case "Text":
      case "Date":
        setSelectedFieldForDialog(item);
        break;
      case "Live Photo":
        setSelectedFieldForDialog(item);
        setPhotoDialog(true);
        break;
      default:
        console.warn("Unknown component clicked:", item.component);
    }
  };

  const updateField = useCallback((data: string | null, id: number) => {
    setDroppedComponents(prev => {
      const newComponents = prev.map(c => {
        if (c.id === id) {
          return { ...c, data };
        }
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
  }, [setDroppedComponents, saveState, recipients]);

const onImgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = await blobToURL(file);

  // Update the DroppedComponent that is currently being dragged
  if (draggingComponent && 'id' in draggingComponent) {
    setDroppedComponents(prev => {
      const newComponents = prev.map(comp => {
        if (comp.id === draggingComponent.id) {
          return { ...comp, data: url };
        }
        const recipient = recipients.find(r => r.id === comp.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === comp.id);
          if (prevComponent && prevComponent.data) {
            return { ...comp, data: prevComponent.data };
          }
        }
        return comp;
      });
      saveState(newComponents);
      return newComponents;
    }
    );
  }

  e.target.value = '';
};

 const toggleMenu = (event: React.MouseEvent, pageIndex?: number) => {
  setMenuTriggerElement(event.currentTarget as HTMLElement);
  if (typeof pageIndex === 'number') {
    setSelectedPageIndex(pageIndex);
  }
  setShowMenu(true);
};
  //auto-highlighted thumbnails when scrolling
 useEffect(() => {
    if (!pages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const pageNum = parseInt(
            visible.target.getAttribute('data-page') || '0',
            10
          );
          if (pageNum) {
            setCurrentPage(pageNum);
          }
        }
      },
      { root: null, threshold: [0.25, 0.5, 0.75] }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    if (typeof onPageChange === 'function') {
      onPageChange(currentPage);
    }
    if (typeof onNumPagesChange === 'function') {
      onNumPagesChange(pages.length);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const activeThumb = thumbRefs.current[currentPage - 1];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);


// save signed copy
useEffect(() => {
  if (onSignedSaveDocument) {    
    onSignedSaveDocument(() => saveToServer().then(() => {
      console.log('Document updated')
    })); // Wrap saveToServer to return Promise<void>
  }
}, [onSignedSaveDocument, saveToServer]);

  // Finalize session when user leaves the editor: persist last editHistory as metadata-only and clear session
  useEffect(() => {
    const finalizeSession = async () => {
      try {
        if (typeof window === 'undefined') return;
        const currentDocumentId = localStorage.getItem('currentDocumentId');
        const currentSessionId = localStorage.getItem('currentSessionId');
        if (!currentDocumentId || !currentSessionId) return;

        // Build metadata-only FormData and use fetch keepalive to improve chance of delivery on unload
        const formData = new FormData();
        
        formData.append('isMetadataOnly', 'true');
        formData.append('sessionId', currentSessionId);
        formData.append('documentId', currentDocumentId);
        formData.append('fields', JSON.stringify(droppedComponents.map(comp => ({
          id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
          type: getFieldTypeFromComponentLabel(comp.component),
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          pageNumber: comp.pageNumber || currentPage,
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
        //  formData.append('documentName', cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`);
        }

        const token = localStorage.getItem('AccessToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // use keepalive to improve unload delivery
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          headers: Object.keys(headers).length ? headers : undefined,
          credentials: 'include',
          keepalive: true,
        });

        if (!res.ok) {
          console.warn('Finalize session request failed', await res.text());
        }

        // Clear current session to mark it ended
        localStorage.removeItem('currentSessionId');
      } catch (err) {
        console.error('Failed to finalize session:', err);
      }
    };

    window.addEventListener('beforeunload', finalizeSession);

    return () => {
      // on component unmount, finalize session
      finalizeSession();
      window.removeEventListener('beforeunload', finalizeSession);
    };
  }, [droppedComponents, recipients, documentName, currentPage]);

  // Auto-save metadata when user finishes renaming (isEditingFileName toggles false)
  const lastSavedNameRef = React.useRef<string | null>(null);

  useEffect(() => {
    const saveRenameIfNeeded = async () => {
      const id = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      if (!id) return;
      // Only save if the user changed the name and it's different than lastSavedName
      if (lastSavedNameRef.current !== documentName && documentName && documentName.trim()) {
        try {
          // use uploadToServer with isMetadataOnly = true
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

    // run when user finishes editing documentName (isEditingFileName becomes false)
    if (!isEditingFileName) {
      saveRenameIfNeeded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingFileName]);

  const containerHeight = pageRefs.current.reduce((acc, page) => {
    if (!page) return acc;
    const rect = page.getBoundingClientRect();
    return acc + rect.height + 40; // 40 for margin/padding between pages
  }, 0);

 const hasUnsavedChanges = useMemo(() => {
  if (!lastSavedState) return false; // Don't flag changes if nothing to compare with yet

  const fieldsChanged = !areDroppedComponentsEqual(droppedComponents, lastSavedState.components);
  const recipientsChanged = !areRecipientsEqual(recipients, lastSavedState.recipients);
  const nameChanged = documentName.trim() !== lastSavedState.name.trim();

  return fieldsChanged || recipientsChanged || nameChanged;
}, [droppedComponents, recipients, documentName, lastSavedState]);



  // ==========================================================
  // Render
  // ==========================================================
  return (
    <>
      {!isLoggedIn && <Modal visible={showModal} onClose={() => setShowModal(false)}><LoginPage/></Modal>}
      
      {!isSigningMode &&
      <ActionToolBar
        documentName={documentName}
        setDocumentName={setDocumentName}
        isEditingFileName={isEditingFileName}
        setIsEditingFileName={setIsEditingFileName}
        handleSavePDF={handleSavePDF}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        recipients={recipients}
        onSendDocument={() => setShowSendDocument(true)}
        onSaveAsTemplate={() => setShowSaveAsTemplate(true)}
        hasUnsavedChanges={hasUnsavedChanges}
        droppedItems={droppedComponents}
        isLoggedIn={isLoggedIn}
        setShowModal={setShowModal} // Pass setShowModal directly
        checkFieldError={setDroppedComponents} // Pass a function that triggers re-evaluation
      />}

      {/* Save as Template Modal */}
      {showSaveAsTemplate && (
        isLoggedIn ? (
                    <SaveAsTemplateModal
                      documentId={documentId}
                      documentName={documentName || 'Untitled'}
                      documentFileUrl={typeof selectedFile === 'string' ? selectedFile : ''}
                      documentFields={droppedComponents.map((c) => ({
                        id: String(c.id),
                        type: getFieldTypeFromComponentLabel(c.component || '')  as DocumentFieldType,
                        x: c.x,
                        y: c.y,
                        width: c.width,
                        height: c.height,
                        pageNumber: c.pageNumber,
                        recipientId: c.assignedRecipientId,
                        required: c.required !== undefined ? c.required : true,
                        value: c.data || '',
                        placeholder: c.placeholder,
                      }))}
            documentDefaultSigners={recipients}
            documentPageCount={pages.length}
            documentFileSize={0}
            onClose={() => setShowSaveAsTemplate(false)}
            onSuccess={() => {
              setShowSaveAsTemplate(false);
              toast.success('Template saved');
            }}
          />
        ) : (
          // If not logged in, show login modal instead
          <>
            {setShowModal(true)}
          </>
        )
      )}
      <div className='bg-[#efefef] flex h-[calc(100vh-106px)]'>
         {!isSigningMode &&
         <>
        <div className="bg-white border-r w-72 flex flex-col select-none">
        <Fields
          activeComponent={draggingComponent}
          setActiveComponent={setDraggingComponent}
          mouseDown={mouseDownOnField}
          selectedFile={selectedFile as File}
        
        />
         <RecipientsList recipients={recipients} onAddRecipients={handleAddRecipients} />
        </div>
        {!selectedFile && (<UploadZone />)}
           {draggingComponent && (
              <div
                className="bg-[#f4faff] border border-1 border-blue-300 px-2 text-center text-[12px] fixed min-w-[100px] z-[999999] left-[7px] top-[38px]"
                style={{
                  transform: `translate(${position.x + 50}px, ${position.y + 2}px)`,
                }}
                ref={draggingEle}
              >
                {draggingComponent.component}
              </div>
            )}
        </>
        }
            <input type="file" ref={imageRef} id="image" className="hidden"  accept="image/png, image/jpeg, image/jpg" onChange={onImgUpload}  />
            <div className={`flex relative overflow-auto flex-1 pb-10 justify-center ${draggingComponent && 'cursor-fieldpicked'}`} id="dropzone" >
            <div style={{ minHeight: `${containerHeight}px`, transform: `scale(${zoom})`, transformOrigin: 'top center' }}  onClick={clickOnDropArea}
              onMouseMove={mouseMoveOnDropArea}
              onMouseLeave={mouseLeaveOnDropArea}
              ref={documentRef}
               >
                 <DroppedComponents
                    droppedComponents={droppedComponents}
                    setDroppedComponents={setDroppedComponents}
                    selectedFieldId={selectedFieldId}
                    setSelectedFieldId={setSelectedFieldId}
                    onAssignRecipient={handleAssignRecipient}
                    onDuplicateField={handleDuplicateField}
                    onDeleteField={handleDeleteField}
                    updateField={updateField}
                    handleDragStop={handleDragStop}
                    handleResizeStop={handleResizeStop}
                    textFieldRefs={textFieldRefs}
                    zoom={zoom}
                    recipients={recipients}
                    onAddRecipients={() => setShowAddRecipients(true)}
                    isSigningMode={isSigningMode}
                    isSigned={isSigned}
                    onClickField={clickField}
                    currentRecipientId={currentRecipientId}
                  />
              <PDFViewer selectedFile={selectedFile as File} pages={pages} zoom={1} pageRefs={pageRefs} generateThumbnails={(data) => generateThumbnails(data)} insertBlankPageAt={insertBlankPageAt} toggleMenu={toggleMenu} error={error || ''} isSigningMode={isSigningMode} signingToken={signingToken}/>
            </div>
            </div>
            {/* Aside Panel for Page Thumbnails */}
            <PageThumbnails
              selectedFile={selectedFile as File}
              pages={pages}
              currentPage={currentPage}
              thumbRefs={thumbRefs}
              handleThumbnailClick={handleThumbnailClick}
              insertBlankPageAt={insertBlankPageAt}
              toggleMenu={toggleMenu}
              isSigningMode={isSigningMode}
            />
         
      
        {photoDialog && (
          <LivePhotoDialog
            onClose={() => setPhotoDialog(false)}
            onConfirm={(data: string) => {
              if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
              setPhotoDialog(false);
            }}
          />
        )}
        {canvasFields && draggingComponent?.fieldOwner === "me" &&
          <UserItems
            onClose={() => setCanvasFields(false)}
            onAdd={(value) => {
              if (selectedFieldForDialog) {
                // Update the specific dropped component's data
                updateField(value.value, selectedFieldForDialog.id);
              }
            }}
            component={selectedFieldForDialog}
          />
        }
        {canvasFields && isSigningMode && draggingComponent?.fieldOwner !== "me" &&
           <RecipientItems
            component={draggingComponent as DroppingField}
            value={selectedFieldForDialog?.data ?? null} 
            onAdd={(value) => {
              if (selectedFieldForDialog) {
                // Update the specific dropped component's data
                updateField(value.value, selectedFieldForDialog.id);
              }
            }}
            onClose={() => setCanvasFields(false)}
          />
        } 
        {!isSigningMode && (
        <>
        {/* Add Recipients Modal */}
        {showAddRecipients && (
          <AddRecipientModal
            isOpen={showAddRecipients}
            onClose={() => setShowAddRecipients(false)}
            recipients={recipients}
            onRecipientsChange={setRecipients}
          />
        )}

        {/* Send Document Modal */}
        {showSendDocument && (
          <SendDocumentModal
            isOpen={showSendDocument}
            onClose={() => setShowSendDocument(false)}
            recipients={recipients}
            documentName={documentName}
            documentId={documentId}
            onSendComplete={() => {
              // Optionally redirect to dashboard or show success message
              toast.success('Document sent successfully');
            }}
          />
        )}

         <Footer
          currentPage={currentPage}
          totalPages={pages.length}
          zoom={zoom}
          setZoom={setZoom}
          onPageChange={handleThumbnailClick}
        />
      </> 
      )}        
      </div>
      {/* -- PageThumbnailMenu integration (uses pdfDoc, pageIndex and onPdfUpdated) */}
     {pdfDoc && showMenu && selectedPageIndex !== null && (
      <PageThumbnailMenu
        onClose={() => setShowMenu(false)}
        triggerElement={menuTriggerElement}
        pdfDoc={pdfDoc}
        pageIndex={selectedPageIndex}
        onPdfUpdated={handlePdfUpdated}
      />
      )}
      <DeletedDocumentDialog isOpen={showDeletedDialog} onClose={() => setShowDeletedDialog(false)} />
    </> 
  );
};

export default DocumentEditor;
