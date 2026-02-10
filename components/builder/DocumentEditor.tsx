"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Third-party
import { pdfjs } from "react-pdf";
import { initializePdfWorker } from '@/utils/pdfjsSetup';

// Project utils & types
import { DroppingField, DroppedComponent, Recipient, DocumentField, IDocument } from '@/types/types';


// Components
import useContextStore from '@/hooks/useContextStore';
import Modal from '../Modal';
import ActionToolBar from '@/components/builder/ActionToolBar';
import { useSignatureInitial } from '@/hooks/builder/useSignatureInitial';
import DocumentStatusBars from './DocumentStatusBars';
import DocumentSendConfirmationModal from './DocumentSendConfirmationModal';
import DocumentActionModals from './DocumentActionModals';
import EditorWorkspace from './EditorWorkspace';
import SaveAsTemplateGate from './SaveAsTemplateGate';
import { usePdfState } from '@/hooks/builder/usePdfState';
import { useFieldInteractions } from '@/hooks/builder/useFieldInteractions';
import { useDocumentSave } from '@/hooks/builder/useDocumentSave';
import { useDocumentActions } from '@/hooks/builder/useDocumentActions';
import { useDocumentLoader } from '@/hooks/builder/useDocumentLoader';
import { useDocumentDraft } from '@/hooks/builder/useDocumentDraft';
import { useSendFlow } from '@/hooks/builder/useSendFlow';
import { useDroppedComponentsState } from '@/hooks/builder/useDroppedComponentsState';
import { useUndoRedoControls } from '@/hooks/builder/useUndoRedoControls';
import { useFieldUpdates } from '@/hooks/builder/useFieldUpdates';
import { useDocumentStatusFlags } from '@/hooks/builder/useDocumentStatusFlags';
const LoginPage = dynamic(() => import('@/app/login/page'), { ssr: false });
const PageThumbnailMenu = dynamic(() => import('@/components/builder/PageThumbnailMenu'), { ssr: false });
const DeletedDocumentDialog = dynamic(() => import('./DeletedDocumentDialog'), { ssr: false });

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

  const {
    pdfDoc,
    pages,
    currentPage,
    zoom,
    setZoom,
    showMenu,
    setShowMenu,
    selectedPageIndex,
    menuTriggerElement,
    documentRef,
    pageRefs,
    thumbRefs,
    generateThumbnails,
    handleThumbnailClick,
    handlePdfUpdated,
    insertBlankPageAt,
    toggleMenu,
  } = usePdfState({
    selectedFile,
    setSelectedFile,
    onPageChange,
    onNumPagesChange,
  });

  // ========= Drag & Drop =========
  const [draggingComponent, setDraggingComponent] = useState<DroppingField | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);

  // ========= UI State =========
  const [error, setError] = useState<string | null>(null);
  const [photoDialog, setPhotoDialog] = useState<boolean>(false);
  const [canvasFields, setCanvasFields] = useState<boolean>(false)
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [selectedFieldForDialog, setSelectedFieldForDialog] = useState<DroppedComponent | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [autoDate] = useState<boolean>(true);
  const [documentName, setDocumentName] = useState<string>('');
  const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);
  const [derivedFromDocumentId, setDerivedFromDocumentId] = useState<string | null>(null);
  const [derivedFromVersion, setDerivedFromVersion] = useState<number | null>(null);
  const [signingEvents, setSigningEvents] = useState<NonNullable<IDocument['signingEvents']>>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDeriveModal, setShowDeriveModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  // ========= Recipients State =========
  const [showAddRecipients, setShowAddRecipients] = useState<boolean>(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const {
    isReadOnly,
    isInProgress,
    isVoided,
    isSent,
    isAlreadySent,
    isPreviewMode,
  } = useDocumentStatusFlags({ isSigningMode, documentStatus });
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleAddRecipients = useCallback(() => {
    setShowAddRecipients(true);
  }, []);
  // ========= Refs =========
  const draggingEle = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const textFieldRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const { droppedComponents, setDroppedComponents, internalDroppedComponents } = useDroppedComponentsState({
    isSigningMode,
    initialFields,
    onFieldsChange,
  });

  const { defaults } = useSignatureInitial({
    user,
    setUser,
    droppedComponents,
    updateComponentData: (id, data) => setDroppedComponents(prev => prev.map(comp => comp.id === id ? { ...comp, data: data.value } : comp))
  });
  // ========= Undo/Redo =========
  const { saveState, canUndo, canRedo, resetHistory: resetHistoryWithState, handleUndo, handleRedo } = useUndoRedoControls(
    internalDroppedComponents,
    setDroppedComponents
  );

  const clearHistory = useCallback(() => {
    resetHistoryWithState([]);
  }, [resetHistoryWithState]);

  const handleInsertBlankPage = useCallback((index: number) => {
    insertBlankPageAt(index, () => {
      setDroppedComponents([]);
      resetHistoryWithState([]);
    });
  }, [insertBlankPageAt, resetHistoryWithState, setDroppedComponents]);
  const { updateField } = useFieldUpdates({
    recipients,
    setDroppedComponents,
    saveState,
  });

  const {
    mouseDownOnField,
    mouseMoveOnDropArea,
    mouseLeaveOnDropArea,
    clickOnDropArea,
    handleDeleteField,
    handleDuplicateField,
    handleAssignRecipient,
    handleDragStop,
    handleResizeStop,
    clickField,
    onImgUpload,
    handleSelectField,
  } = useFieldInteractions({
    isSigningMode,
    currentPage,
    zoom,
    user,
    defaults,
    recipients,
    setRecipients,
    draggingComponent,
    setDraggingComponent,
    draggingEle,
    setPosition,
    elementId,
    setElementId,
    setDroppedComponents,
    saveState,
    documentRef,
    pageRefs,
    setSelectedFieldId,
    setSelectedFieldForDialog,
    setCanvasFields,
    setPhotoDialog,
    imageRef,
  });

  const { saveToServer, handleSavePDF, hasUnsavedChanges, markSavedState } = useDocumentSave({
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
    resetHistory: clearHistory,
    setPosition,
    setShowDeletedDialog,
    setError,
    autoDate,
    isEditingFileName,
  });

  useDocumentLoader({
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
    resetHistory: resetHistoryWithState,
    setElementId,
    markSavedState,
  });

  useDocumentDraft({
    documentId,
    droppedComponents,
    recipients,
    documentName,
    selectedFile,
    currentPage,
    zoom,
    documentRef,
    pageRefs,
  });

  const {
    isDownloadingSigned,
    isDeriving,
    isVoiding,
    handleDownloadSigned,
    handleDeriveDocument,
    handleVoidAndDerive,
  } = useDocumentActions({
    documentId,
    documentName,
    setShowDeriveModal,
    setShowVoidModal,
  });

  const {
    showSendDocument,
    setShowSendDocument,
    showSendConfirmation,
    setShowSendConfirmation,
    handleSendComplete,
    handleGoToDashboard,
    handleVoidFromConfirmation,
    handleOpenSendModal,
  } = useSendFlow({
    isAlreadySent,
    setShowVoidModal,
    setDocumentStatus,
    setRecipients,
  });

  // save signed copy
  useEffect(() => {
    if (onSignedSaveDocument) {
      onSignedSaveDocument(() => saveToServer().then(() => {
        console.log('Document updated')
      })); // Wrap saveToServer to return Promise<void>
    }
  }, [onSignedSaveDocument, saveToServer]);


  const containerHeight = pageRefs.current.reduce((acc, page) => {
    if (!page) return acc;
    const rect = page.getBoundingClientRect();
    return acc + rect.height + 40; // 40 for margin/padding between pages
  }, 0);


  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div className="flex-1">
      {!isLoggedIn && <Modal visible={showModal} onClose={() => setShowModal(false)}><LoginPage /></Modal>}

      <DocumentStatusBars
        isSigningMode={isSigningMode}
        isCompleted={!isSigningMode && documentStatus === 'completed'}
        isInProgress={isInProgress}
        isSent={isSent}
        isVoided={isVoided}
        isReadOnly={isReadOnly}
        derivedFromDocumentId={derivedFromDocumentId}
        derivedFromVersion={derivedFromVersion}
        isDeriving={isDeriving}
        isDownloadingSigned={isDownloadingSigned}
        isVoiding={isVoiding}
        onShowAudit={() => setShowAuditModal(true)}
        onDownloadSigned={handleDownloadSigned}
        onShowDerive={() => setShowDeriveModal(true)}
        onShowVoid={() => setShowVoidModal(true)}
      />

      {!isSigningMode && !isReadOnly &&
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
          onSendDocument={handleOpenSendModal}
          isAlreadySent={isAlreadySent}
          onVoidAndDerive={() => setShowVoidModal(true)}
          onSaveAsTemplate={() => setShowSaveAsTemplate(true)}
          hasUnsavedChanges={hasUnsavedChanges}
          droppedItems={droppedComponents}
          isLoggedIn={isLoggedIn}
          setShowModal={setShowModal} // Pass setShowModal directly
          checkFieldError={setDroppedComponents} // Pass a function that triggers re-evaluation
        />}

      <SaveAsTemplateGate
        showSaveAsTemplate={showSaveAsTemplate}
        isLoggedIn={isLoggedIn}
        setShowSaveAsTemplate={setShowSaveAsTemplate}
        setShowModal={setShowModal}
        documentId={documentId}
        documentName={documentName}
        selectedFile={selectedFile}
        droppedComponents={droppedComponents}
        recipients={recipients}
        pages={pages}
        documentRef={documentRef}
        pageRefs={pageRefs}
        currentPage={currentPage}
        zoom={zoom}
      />
      <EditorWorkspace
        isSigningMode={isSigningMode}
        isReadOnly={isReadOnly}
        isPreviewMode={isPreviewMode}
        isSigned={isSigned}
        selectedFile={selectedFile}
        documentName={documentName}
        documentId={documentId}
        signingToken={signingToken}
        currentRecipientId={currentRecipientId}
        recipients={recipients}
        setRecipients={setRecipients}
        showAddRecipients={showAddRecipients}
        setShowAddRecipients={setShowAddRecipients}
        showSendDocument={showSendDocument}
        setShowSendDocument={setShowSendDocument}
        onSendComplete={handleSendComplete}
        draggingComponent={draggingComponent}
        setDraggingComponent={setDraggingComponent}
        mouseDownOnField={mouseDownOnField}
        handleAddRecipients={handleAddRecipients}
        draggingEle={draggingEle}
        position={position}
        imageRef={imageRef}
        onImgUpload={onImgUpload}
        containerHeight={containerHeight}
        zoom={zoom}
        setZoom={setZoom}
        currentPage={currentPage}
        pages={pages}
        error={error}
        documentRef={documentRef}
        pageRefs={pageRefs}
        thumbRefs={thumbRefs}
        textFieldRefs={textFieldRefs}
        mouseMoveOnDropArea={mouseMoveOnDropArea}
        mouseLeaveOnDropArea={mouseLeaveOnDropArea}
        clickOnDropArea={clickOnDropArea}
        droppedComponents={droppedComponents}
        setDroppedComponents={setDroppedComponents}
        selectedFieldId={selectedFieldId}
        setSelectedFieldId={setSelectedFieldId}
        onSelectField={handleSelectField}
        onAssignRecipient={handleAssignRecipient}
        onDuplicateField={handleDuplicateField}
        onDeleteField={handleDeleteField}
        updateField={updateField}
        handleDragStop={handleDragStop}
        handleResizeStop={handleResizeStop}
        onClickField={clickField}
        handleThumbnailClick={handleThumbnailClick}
        insertBlankPageAt={handleInsertBlankPage}
        toggleMenu={toggleMenu}
        generateThumbnails={generateThumbnails}
        photoDialog={photoDialog}
        setPhotoDialog={setPhotoDialog}
        canvasFields={canvasFields}
        setCanvasFields={setCanvasFields}
        selectedFieldForDialog={selectedFieldForDialog}
      />
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

      <DocumentSendConfirmationModal
        visible={showSendConfirmation}
        onClose={() => setShowSendConfirmation(false)}
        onGoToDashboard={handleGoToDashboard}
        onVoidAndCreateRevision={handleVoidFromConfirmation}
      />

      <DocumentActionModals
        showVoidModal={showVoidModal}
        setShowVoidModal={setShowVoidModal}
        isVoiding={isVoiding}
        onVoidAndDerive={handleVoidAndDerive}
        showDeriveModal={showDeriveModal}
        setShowDeriveModal={setShowDeriveModal}
        isDeriving={isDeriving}
        onDeriveDocument={handleDeriveDocument}
        showAuditModal={showAuditModal}
        setShowAuditModal={setShowAuditModal}
        signingEvents={signingEvents}
      />
    </div>
  );
};

export default DocumentEditor;
