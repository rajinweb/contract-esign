"use client";
import React, { useEffect, useState, useRef, MouseEvent, ChangeEvent, useCallback} from 'react';
// removed IndexedDB usage: files are served from server and referenced by URL
// Third-party
import { pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { DraggableData } from 'react-rnd';

// Project utils & types
import { blobToURL } from "@/utils/Utils";
import { DroppingField, DroppedComponent,  Recipient, HandleSavePDFOptions, DocumentField } from '@/types/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';

// Components
import UploadZone from "@/components/UploadZone";
import Fields from '@/components/builder/Fields';
import useContextStore from '@/hooks/useContextStore';
import { AddSigDialog } from "@/components/builder/AddSigDialog";
import { RealtimePhotoDialog } from "@/components/builder/RealtimePhotoDialog";
import Modal from '../Modal';
import AddRecipientModal from './AddRecipientModal';
import SendDocumentModal from './SendDocumentModal';
import ActionToolBar from '@/components/builder/ActionToolBar';
import PageThumbnailMenu from '@/components/builder/PageThumbnailMenu';
import PageThumbnails from './PageThumbnails';
import PDFViewer from './PDFViewer';
import DroppedComponents from './DroppedComponents';
import Footer from './Footer';
import RecipientsList from './RecipientsList';
import toast from 'react-hot-toast';
import {loadPdf, sanitizeFileName, createBlobUrl, mergeFieldsIntoPdf, savePdfBlob, uploadToServer, downloadPdf} from '@/utils/handleSavePDF';
// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface DocumentEditorProps {
  documentId?: string | null;
  initialFileUrl?: string | null;
  initialFileName?: string | null;
  initialFields?: any[] | null;
  initialRecipients?: any[] | null;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId: propDocumentId = null, initialFileUrl = null, initialFileName = null, initialFields = null, initialRecipients = null }) => {
  // ========= Context =========
  const { selectedFile, setSelectedFile, isLoggedIn, showModal, setShowModal } = useContextStore();

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
  const [droppedComponents, setDroppedComponents] = useState<DroppedComponent[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);

  // ========= Undo/Redo =========
  const { saveState, undo, redo, canUndo, canRedo, resetHistory } = useUndoRedo(droppedComponents);

  // ========= UI State =========
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<boolean>(false);
  const [photoDialog, setPhotoDialog] = useState<boolean>(false);
  const [selectedFieldForDialog, setSelectedFieldForDialog] = useState<DroppedComponent | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [autoDate, setAutoDate] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('');
  const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);
  
  // ========= Recipients State =========
  const [showAddRecipients, setShowAddRecipients] = useState<boolean>(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showSendDocument, setShowSendDocument] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // ========= Refs =========
  const documentRef = useRef<HTMLDivElement | null>(null);
  const draggingEle = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textFieldRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // If the route passed initial props (prefetch), seed state from them on mount
  useEffect(() => {
    if (initialFields && Array.isArray(initialFields) && initialFields.length) {
      const restored = initialFields.map((field: any) => ({
        id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
        component: (String(field.type || '')).charAt(0).toUpperCase() + String(field.type || '').slice(1).replace('_',' '),
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        pageNumber: field.pageNumber,
        data: field.value,
        assignedRecipientId: field.recipientId,
        required: field.required !== false,
        placeholder: field.placeholder,
      } as DroppedComponent));
      setDroppedComponents(restored);
      const maxId = Math.max(0, ...restored.map(c => c.id));
      setElementId(maxId + 1);
      resetHistory(restored);
    }
    if (initialRecipients && Array.isArray(initialRecipients) && initialRecipients.length) {
      setRecipients(initialRecipients);
    }
    if (initialFileUrl) {
      setSelectedFile(initialFileUrl);
    }
    if (initialFileName) setFileName(initialFileName);
    if (propDocumentId) setDocumentId(propDocumentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Draft autosave (sessionStorage) ---
  const draftKey = (id: string | null | undefined) => `doc-draft:${id || 'unknown'}`;

  // On mount, prefer sessionStorage draft if present
  useEffect(() => {
    try {
      const id = propDocumentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      if (!id) return;
      const raw = sessionStorage.getItem(draftKey(id));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.fields) {
          const restored: DroppedComponent[] = parsed.fields.map((field: any) => ({
            id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
            component: (String(field.type || '')).charAt(0).toUpperCase() + String(field.type || '').slice(1).replace('_',' '),
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            pageNumber: field.pageNumber,
            data: field.value,
            assignedRecipientId: field.recipientId,
            required: field.required !== false,
            placeholder: field.placeholder,
          } as DroppedComponent));
          setDroppedComponents(restored);
          const maxId = Math.max(0, ...restored.map(c => c.id));
          setElementId(maxId + 1);
          resetHistory(restored);
        }
        if (parsed.recipients) setRecipients(parsed.recipients);
        if (parsed.fileName) setFileName(parsed.fileName);
        if (parsed.fileUrl) setSelectedFile(parsed.fileUrl);
      }
    } catch (err) {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft to sessionStorage when relevant state changes (debounced)
  useEffect(() => {
    const id = documentId || propDocumentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
    if (!id) return;

    const handler = setTimeout(() => {
      try {
        const payload = {
          fields: droppedComponents.map(c => ({
            id: c.id?.toString(),
            type: (c.component || '').toLowerCase().replace(' ', '_'),
            x: c.x,
            y: c.y,
            width: c.width,
            height: c.height,
            pageNumber: c.pageNumber,
            recipientId: c.assignedRecipientId,
            required: c.required,
            value: c.data,
            placeholder: c.placeholder,
          })),
          recipients,
          fileName,
          fileUrl: typeof selectedFile === 'string' ? selectedFile : null,
          updatedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(draftKey(id), JSON.stringify(payload));
      } catch (err) {
        // ignore
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [droppedComponents, recipients, fileName, selectedFile, documentId, propDocumentId, resetHistory]);

  // ==========================================================
  // Undo/Redo Functions
  // ==========================================================
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setDroppedComponents(previousState);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setDroppedComponents(nextState);
    }
  }, [redo]);

  /* Save state to history when components change (with debouncing)*/
  const saveToHistory = useCallback((components: DroppedComponent[]) => {
    // Debounce to avoid saving too frequently during drag operations
    const timeoutId = setTimeout(() => {
      saveState(components);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [saveState]);

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
    if (!selectedFile) return;
    const arrayBuffer = typeof selectedFile === 'string'
      ? await fetch(selectedFile).then(res => res.arrayBuffer())
      : await selectedFile.arrayBuffer();

    const pdfDocLocal = await PDFDocument.load(arrayBuffer);
    pdfDocLocal.insertPage(index, [595.28, 841.89]); // A4 size

    await handlePdfUpdated(pdfDocLocal);
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

  const mouseDownOnField = (component: string, e: MouseEvent<HTMLDivElement>) => {
    const xy = { x: e.clientX, y: e.clientY };
    setDraggingComponent({ ...draggingComponent, component, ...xy });
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
    if (!draggingComponent || e.target instanceof HTMLElement && e.target.closest('.react-draggable') || e.target instanceof HTMLElement && e.target?.closest('.page-brake')) return;

    // Clear field selection when clicking on empty area
    setSelectedFieldId(null);

    const rect = documentRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Calculate the page number for the dropped component
    let targetPageNumber = currentPage;
    const dropY = e.clientY;
    
    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;
      
      const pageRect = pageEl.getBoundingClientRect();
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
    };

    console.log('Adding new component:', newComponent);

    setDroppedComponents((prev) => [...prev, newComponent]);
    // Save state after adding component
    saveToHistory([...droppedComponents, newComponent]);
    setElementId((id) => id + 1);
  };

  const handleDeleteField = (item: DroppedComponent) => {
    setDroppedComponents((prev) => {
      const newComponents = prev.filter((c) => c.id !== item.id);      
      // Save state after deleting component
      saveToHistory(newComponents);
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
      assignedRecipientId: undefined, // Reset assignment for duplicate
    };

    setDroppedComponents((prev) => [...prev, newComponent]);
    saveToHistory([...droppedComponents, newComponent])
    setElementId((id) => id + 1);
    setSelectedFieldId(newComponent.id);
  };

  const handleAssignRecipient = (fieldId: number, recipientId: string | null) => {
    setDroppedComponents((prev) => {
      const newComponents = prev.map((c) =>
        c.id === fieldId ? { ...c, assignedRecipientId: recipientId } : c
      );
      saveToHistory(newComponents);
      return newComponents;
    });
  };

  const handleDragStop = (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => {
    document.body.classList.remove('dragging-no-select');
    if ((e.target as HTMLElement).closest('.delete-button-wrapper')) {
      return;
    }

    if (data.x === item.x && data.y === item.y) {
      clickField(e as MouseEvent, item);
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

  // Check each page
  for (let i = 0; i < pageRefs.current.length; i++) {
    const pageEl = pageRefs.current[i];
    if (!pageEl) continue;

    const rect = pageEl.getBoundingClientRect();
    const pageTopAbs = rect.top + scrollY;
    const pageBottomAbs = pageTopAbs + rect.height;

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
        ? { ...c, x: data.x, y: newY, pageNumber: newPageNumber }
        : c
      );
      // Save state after drag stop
     saveToHistory(newComponents);
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
      // Save state after resize stop
     saveToHistory(newComponents);
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  useEffect(() => {
    // Load document data if we have a documentId from localStorage (read at runtime so dynamic route can set it)
    const loadDocumentData = async () => {
      const storedDocumentId = typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null;
      if (storedDocumentId) {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const response = await fetch(`/api/documents/load?id=${storedDocumentId}`, {
            headers: Object.keys(headers).length ? headers : undefined,
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.document) {
              console.log('Loaded document data:', data.document);

              // Restore fields and recipients from the saved document
              const savedFields = data.document.fields || [];
              const savedRecipients = data.document.recipients || [];

              console.log('Restoring fields:', savedFields);

              // Convert saved fields to DroppedComponent format
              const restoredComponents: DroppedComponent[] = savedFields.map((field: DocumentField) => {
                const ft = String(field.type || '');
                const componentLabel = ft === 'signature' ? 'Signature'
                  : ft === 'text' ? 'Text'
                  : ft === 'date' ? 'Date'
                  : ft === 'image' ? 'Image'
                  : ft === 'checkbox' ? 'Checkbox'
                  : (ft === 'realtime_photo' || ft === 'realtime photo') ? 'Realtime Photo'
                  : ft.charAt(0).toUpperCase() + ft.slice(1);

                return {
                  id: parseInt(field.id) || Math.floor(Math.random() * 1000000),
                  component: componentLabel,
                  x: field.x,
                  y: field.y,
                  width: field.width,
                  height: field.height,
                  pageNumber: field.pageNumber,
                  data: field.value,
                  assignedRecipientId: field.recipientId,
                  required: field.required,
                  placeholder: field.placeholder,
                } as DroppedComponent;
              });

              console.log('Restored components:', restoredComponents);

              setDroppedComponents(restoredComponents);
              setRecipients(savedRecipients);
              setDocumentId(storedDocumentId);
              // Prefer the current version's filename when available
              setFileName(prev => data.document.fileName || data.document.documentName || data.document.originalFileName || prev);

              // Update element ID counter to avoid conflicts
              const maxId = Math.max(0, ...restoredComponents.map(c => c.id));
              setElementId(maxId + 1);

              // Reset history with loaded state
              resetHistory(restoredComponents);

              // set selected file from server file path
              if (data.document.filePath) {
                const fileUrl = `/api/documents/file?path=${encodeURIComponent(data.document.filePath)}`;
                setSelectedFile(fileUrl);
              }
            }
          }
        } catch (error) {
          console.error('Failed to load document data:', error);
        }
      }
    };

    // Call loader
    loadDocumentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  const saveToServer = async (): Promise<void> => {
    if (!selectedFile) return;
    // Save as blob
    const pdfDoc = await loadPdf(selectedFile as File | string );
    const blob = await savePdfBlob(pdfDoc);
    const safeName = sanitizeFileName(fileName);
    // prefer the documentId stored in component state (set when editor loaded) otherwise fallback to localStorage
    const currentdoc = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
    // Upload to server; pass sessionId so server knows if this is same session (and will overwrite) or a new session (and will create new version)
    const result = await uploadToServer(blob, safeName, currentPage, droppedComponents, recipients, currentdoc, setDocumentId, setFileName, setSelectedFile, sessionId, false);
    if (result && result.documentId) {
      setDocumentId(result.documentId);
    }
  }

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

    if (!selectedFile) {
      console.error("No file selected!");
      return null;
    }
    if(isServerSave){
      await saveToServer();
      return null; 
    }

    const canvas = documentRef.current;
    const canvasRect = canvas?.getBoundingClientRect();
    if (!canvasRect) return null;  

    try {
        // Load and merge
        const pdfDoc = await loadPdf(selectedFile as File | string );
        const blob = await savePdfBlob(pdfDoc);
        const safeName = sanitizeFileName(fileName);
        const pdfUrl = await createBlobUrl(blob); 
         
        if (isMergeFields) {
          await mergeFieldsIntoPdf(pdfDoc, droppedComponents, pageRefs, canvasRect, currentPage, { autoDate });
          setSelectedFile(pdfUrl);
        }
        if (isDownload && isMergeFields){
          downloadPdf(blob, safeName);
        }
        // Cleanup
        if (isDownload || isMergeFields){
          setPosition({ x: 0, y: 0 });
          setDroppedComponents([]);
          resetHistory([]);
        }        
        return true; 
    } catch (err) {
        console.error("Save error:", err);
        setError("Failed to save document.");
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

    if (isDragging) {
      setIsDragging(false);
      return; // ignore click while dragging
    }

    // Set the currently selected component
    setDraggingComponent(item);

    // Handle component-specific actions
    switch (item.component) {
      case "Signature":
         setSelectedFieldForDialog(item);
        setDialog(true); // open signature modal
        break;
      case "Image":
        setSelectedFieldForDialog(item);
        imageRef.current?.click(); // trigger file input
        break;
      case "Text":
      case "Date":
        setSelectedFieldForDialog(item);
        break;
      case "Realtime Photo":
        setSelectedFieldForDialog(item);
        setPhotoDialog(true);
        break;
      default:
        console.warn("Unknown component clicked:", item.component);
    }
  };

const updateField = (data: string | null, id: number) => {
  setDroppedComponents(prev => {
    const newComponents = prev.map(c => (c.id === id ? { ...c, data } : c));
    // Save state after field update
   saveToHistory(newComponents);
    return newComponents;
  }
  );
};

const onImgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = await blobToURL(file);

  // Update the DroppedComponent that is currently being dragged
  if (draggingComponent && 'id' in draggingComponent) {
    setDroppedComponents(prev =>
      prev.map(comp =>
        comp.id === draggingComponent.id
          ? { ...comp, data: url }
          : comp
      )
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

    return () => observer.disconnect();
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
  // ==========================================================
  // Render
  // ==========================================================

  // Finalize session when user leaves the editor: persist last editHistory as metadata-only and clear session
  useEffect(() => {
    const finalizeSession = async () => {
      try {
        const currentdoc = typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null;
        const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
        if (!currentdoc || !sessionId) return;

        // Build metadata-only FormData and use fetch keepalive to improve chance of delivery on unload
        const formData = new FormData();
        // Only include documentName/fileName when the user has explicitly set a name
        if (fileName && fileName.trim()) {
          formData.append('documentName', fileName.trim());
          formData.append('fileName', fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`);
        }
        formData.append('isMetadataOnly', 'true');
        formData.append('sessionId', sessionId);
        formData.append('documentId', currentdoc);
        formData.append('fields', JSON.stringify(droppedComponents.map(comp => ({
          id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
          type: comp.component.toLowerCase().replace(' ', '_'),
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

        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // use keepalive to improve unload delivery
        await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          headers: Object.keys(headers).length ? headers : undefined,
          credentials: 'include',
          keepalive: true,
        });

        // Clear current session to mark it ended
        localStorage.removeItem('currentSessionId');
      } catch (err) {
        console.error('Failed to finalize session:', err);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Attempt to finalize synchronously is limited; call async but allow default unload
      finalizeSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // on component unmount, finalize session
      finalizeSession();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedComponents, recipients, fileName, currentPage]);

  // Auto-save metadata when user finishes renaming (isEditingFileName toggles false)
  const lastSavedNameRef = React.useRef<string | null>(null);
  useEffect(() => {
    // initialize lastSavedName on mount from current fileName
    lastSavedNameRef.current = fileName || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saveRenameIfNeeded = async () => {
      const id = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
      if (!id) return;
      // Only save if the user changed the name and it's different than lastSavedName
      if (lastSavedNameRef.current !== fileName && fileName && fileName.trim()) {
        try {
          // use uploadToServer with isMetadataOnly = true
          const sessionId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
          const res = await uploadToServer(null, fileName.trim(), currentPage, droppedComponents, recipients, id, setDocumentId, setFileName, setSelectedFile, sessionId, true);
          if (res && res.fileName) {
            setFileName(res.documentName as string);
            lastSavedNameRef.current = res.fileName;
          } else {
            lastSavedNameRef.current = fileName;
          }
        } catch (err) {
          console.error('Failed to save renamed document name:', err);
        }
      }
    };

    // run when user finishes editing filename (isEditingFileName becomes false)
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
  return (
    <>
      {!isLoggedIn && <Modal visible={showModal} onClose={() => setShowModal(false)} />}
      <ActionToolBar
        fileName={fileName}
        setFileName={setFileName}
        isEditingFileName={isEditingFileName}
        setIsEditingFileName={setIsEditingFileName}
        handleSavePDF={handleSavePDF}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        recipients={recipients}
        onSendDocument={() => setShowSendDocument(true)}
      />
      <div className='bg-[#efefef] flex h-[calc(100vh-107px)]'>
        <div className="w-72 p-4 border-r border-gray-200 bg-white select-none">
        <RecipientsList recipients={recipients} onAddRecipients={() => setShowAddRecipients(true)} />
        <Fields
          activeComponent={draggingComponent?.component ?? null}
          mouseDown={mouseDownOnField}
          selectedFile={selectedFile as File}
        
        />
        </div>
        {!selectedFile && (<UploadZone />)}
        {selectedFile && (
          <>
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
            <input type="file" ref={imageRef} id="image" className="hidden"  accept="image/png, image/jpeg, image/jpg" onChange={onImgUpload}  />
            <div className={`flex relative my-1 overflow-auto flex-1 justify-center ${draggingComponent && 'cursor-fieldpicked'}`} id="dropzone" >
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
                  />
              <PDFViewer selectedFile={selectedFile as File} pages={pages} zoom={1} pageRefs={pageRefs} generateThumbnails={(data) => generateThumbnails(data)} insertBlankPageAt={insertBlankPageAt} toggleMenu={toggleMenu} error={error || ''}/>
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
            />
          </>
        )}
        {dialog && (
          <AddSigDialog
            autoDate={autoDate}
            setAutoDate={setAutoDate}
            onClose={() => setDialog(false)}
            onConfirm={(data: string | null) => {
             if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
             setDialog(false);
            }}
          />
        )}
        {photoDialog && (
          <RealtimePhotoDialog
            onClose={() => setPhotoDialog(false)}
            onConfirm={(data: string) => {
              if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
              setPhotoDialog(false);
            }}
          />
        )}
        
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
            documentName={fileName}
            documentId={documentId}
            onSendComplete={() => {
              // Optionally redirect to dashboard or show success message
              toast.success('Document sent successfully');
            }}
          />
        )}
      </div>
      {selectedFile && (
        <Footer
          currentPage={currentPage}
          totalPages={pages.length}
          zoom={zoom}
          setZoom={setZoom}
          onPageChange={handleThumbnailClick}
        />
      )}

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
    </>
  );
};

export default DocumentEditor;
