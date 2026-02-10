'use client';
import React from 'react';
import { DraggableData } from 'react-rnd';

import UploadZone from '@/components/UploadZone';
import EditorSidebar from './EditorSidebar';
import PageThumbnails from './PageThumbnails';
import Footer from './Footer';
import EditorCanvas from './EditorCanvas';
import EditorDialogs from './EditorDialogs';
import { Doc, DroppedComponent, DroppingField, FieldOwner, Recipient } from '@/types/types';

interface EditorWorkspaceProps {
  isSigningMode: boolean;
  isReadOnly: boolean;
  isPreviewMode: boolean;
  isSigned?: boolean;
  selectedFile: File | string | Doc | null;
  documentName: string;
  documentId?: string | null;
  signingToken?: string;
  currentRecipientId?: string;
  recipients: Recipient[];
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>;
  showAddRecipients: boolean;
  setShowAddRecipients: React.Dispatch<React.SetStateAction<boolean>>;
  showSendDocument: boolean;
  setShowSendDocument: React.Dispatch<React.SetStateAction<boolean>>;
  onSendComplete: (payload: { recipients: Recipient[]; signingMode: 'sequential' | 'parallel' }) => void;

  draggingComponent: DroppingField | null;
  setDraggingComponent: React.Dispatch<React.SetStateAction<DroppingField | null>>;
  mouseDownOnField: (component: string, event: React.MouseEvent<HTMLDivElement>, fieldOwner: FieldOwner) => void;
  handleAddRecipients: () => void;

  draggingEle: React.RefObject<HTMLDivElement>;
  position: { x: number; y: number };
  imageRef: React.RefObject<HTMLInputElement>;
  onImgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  containerHeight: number;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  currentPage: number;
  pages: number[];
  error: string | null;

  documentRef: React.RefObject<HTMLDivElement>;
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  thumbRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;

  mouseMoveOnDropArea: (e: React.MouseEvent<HTMLDivElement>) => void;
  mouseLeaveOnDropArea: (e: React.MouseEvent<HTMLDivElement>) => void;
  clickOnDropArea: (e: React.MouseEvent<HTMLDivElement>) => void;

  droppedComponents: DroppedComponent[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  selectedFieldId: number | null;
  setSelectedFieldId: React.Dispatch<React.SetStateAction<number | null>>;
  onSelectField: (field: DroppedComponent) => void;
  onAssignRecipient: (fieldId: number, recipientId: string | null) => void;
  onDuplicateField: (field: DroppedComponent) => void;
  onDeleteField: (field: DroppedComponent) => void;
  updateField: (data: string | null, id: number) => void;
  handleDragStop: (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => void;
  handleResizeStop: (
    e: MouseEvent | TouchEvent,
    item: DroppedComponent,
    ref: { style: { width: string; height: string } },
    pos: { x: number; y: number },
    delta?: { width: number; height: number }
  ) => void;
  onClickField: (event: React.MouseEvent<Element>, item: DroppedComponent, isEdit?: boolean) => void;

  handleThumbnailClick: (pageNum: number) => void;
  insertBlankPageAt: (index: number) => void;
  toggleMenu: (event: React.MouseEvent, pageIndex?: number) => void;
  generateThumbnails: (numPages: number) => void;

  photoDialog: boolean;
  setPhotoDialog: React.Dispatch<React.SetStateAction<boolean>>;
  canvasFields: boolean;
  setCanvasFields: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFieldForDialog: DroppedComponent | null;
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  isSigningMode,
  isReadOnly,
  isPreviewMode,
  isSigned,
  selectedFile,
  documentName,
  documentId,
  signingToken,
  currentRecipientId,
  recipients,
  setRecipients,
  showAddRecipients,
  setShowAddRecipients,
  showSendDocument,
  setShowSendDocument,
  onSendComplete,
  draggingComponent,
  setDraggingComponent,
  mouseDownOnField,
  handleAddRecipients,
  draggingEle,
  position,
  imageRef,
  onImgUpload,
  containerHeight,
  zoom,
  setZoom,
  currentPage,
  pages,
  error,
  documentRef,
  pageRefs,
  thumbRefs,
  textFieldRefs,
  mouseMoveOnDropArea,
  mouseLeaveOnDropArea,
  clickOnDropArea,
  droppedComponents,
  setDroppedComponents,
  selectedFieldId,
  setSelectedFieldId,
  onSelectField,
  onAssignRecipient,
  onDuplicateField,
  onDeleteField,
  updateField,
  handleDragStop,
  handleResizeStop,
  onClickField,
  handleThumbnailClick,
  insertBlankPageAt,
  toggleMenu,
  generateThumbnails,
  photoDialog,
  setPhotoDialog,
  canvasFields,
  setCanvasFields,
  selectedFieldForDialog,
}) => {
  return (
    <div className="bg-[#dce0e8] flex flex-1 overflow-hidden relative h-[calc(100%-53px)]">
      {!isSigningMode && (
        <>
          <EditorSidebar
            isReadOnly={isReadOnly}
            activeComponent={draggingComponent}
            setActiveComponent={setDraggingComponent}
            mouseDownOnField={mouseDownOnField}
            selectedFile={selectedFile as File}
            recipients={recipients}
            onAddRecipients={handleAddRecipients}
          />
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
      )}

      <EditorCanvas
        draggingComponent={draggingComponent}
        imageRef={imageRef}
        onImgUpload={onImgUpload}
        containerHeight={containerHeight}
        zoom={zoom}
        documentRef={documentRef}
        mouseMoveOnDropArea={mouseMoveOnDropArea}
        mouseLeaveOnDropArea={mouseLeaveOnDropArea}
        clickOnDropArea={clickOnDropArea}
        droppedComponents={droppedComponents}
        setDroppedComponents={setDroppedComponents}
        selectedFieldId={selectedFieldId}
        setSelectedFieldId={setSelectedFieldId}
        onSelectField={onSelectField}
        onAssignRecipient={onAssignRecipient}
        onDuplicateField={onDuplicateField}
        onDeleteField={onDeleteField}
        updateField={updateField}
        handleDragStop={handleDragStop}
        handleResizeStop={handleResizeStop}
        textFieldRefs={textFieldRefs}
        recipients={recipients}
        onAddRecipients={handleAddRecipients}
        isSigningMode={isSigningMode}
        isReadOnly={isReadOnly}
        isSigned={isSigned}
        onClickField={onClickField}
        currentRecipientId={currentRecipientId}
        selectedFile={selectedFile}
        pages={pages}
        pageRefs={pageRefs}
        generateThumbnails={generateThumbnails}
        insertBlankPageAt={insertBlankPageAt}
        toggleMenu={toggleMenu}
        error={error}
        signingToken={signingToken}
      />

      <PageThumbnails
        selectedFile={selectedFile as File}
        pages={pages}
        currentPage={currentPage}
        thumbRefs={thumbRefs}
        handleThumbnailClick={handleThumbnailClick}
        insertBlankPageAt={insertBlankPageAt}
        toggleMenu={toggleMenu}
        isSigningMode={isPreviewMode}
      />

      <EditorDialogs
        isSigningMode={isSigningMode}
        isReadOnly={isReadOnly}
        showAddRecipients={showAddRecipients}
        setShowAddRecipients={setShowAddRecipients}
        recipients={recipients}
        setRecipients={setRecipients}
        showSendDocument={showSendDocument}
        setShowSendDocument={setShowSendDocument}
        documentName={documentName}
        documentId={documentId}
        onSendComplete={onSendComplete}
        photoDialog={photoDialog}
        setPhotoDialog={setPhotoDialog}
        selectedFieldForDialog={selectedFieldForDialog}
        updateField={updateField}
        canvasFields={canvasFields}
        setCanvasFields={setCanvasFields}
        draggingComponent={draggingComponent}
      />

      {!isSigningMode && !isReadOnly && (
        <Footer
          currentPage={currentPage}
          totalPages={pages.length}
          zoom={zoom}
          setZoom={setZoom}
          onPageChange={handleThumbnailClick}
        />
      )}
    </div>
  );
};

export default EditorWorkspace;
