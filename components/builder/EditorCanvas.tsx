'use client';
import React from 'react';
import { DraggableData } from 'react-rnd';
import DroppedComponents from './DroppedComponents';
import PDFViewer from './PDFViewer';
import { Doc, DroppedComponent, Recipient } from '@/types/types';

interface EditorCanvasProps {
  draggingComponent: { component: string } | null;
  imageRef: React.RefObject<HTMLInputElement>;
  onImgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  containerHeight: number;
  zoom: number;
  documentRef: React.RefObject<HTMLDivElement>;
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
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
  recipients: Recipient[];
  onAddRecipients: () => void;
  isSigningMode: boolean;
  isReadOnly: boolean;
  isSigned?: boolean;
  onClickField: (event: React.MouseEvent<Element>, item: DroppedComponent, isEdit?: boolean) => void;
  currentRecipientId?: string;
  guidedFieldId?: string | null;
  selectedFile: File | string | Doc | null;
  pages: number[];
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  generateThumbnails: (numPages: number) => void;
  insertBlankPageAt: (index: number) => void;
  toggleMenu: (event: React.MouseEvent, pageIndex?: number) => void;
  error: string | null;
  signingToken?: string;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  draggingComponent,
  imageRef,
  onImgUpload,
  containerHeight,
  zoom,
  documentRef,
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
  textFieldRefs,
  recipients,
  onAddRecipients,
  isSigningMode,
  isReadOnly,
  isSigned,
  onClickField,
  currentRecipientId,
  guidedFieldId,
  selectedFile,
  pages,
  pageRefs,
  generateThumbnails,
  insertBlankPageAt,
  toggleMenu,
  error,
  signingToken,
}) => {
  return (
    <>
      <input
        type="file"
        ref={imageRef}
        id="image"
        className="hidden"
        accept="image/png, image/jpeg, image/jpg"
        onChange={onImgUpload}
      />
      <div className={`flex relative overflow-auto flex-1 min-h-0 pb-10 justify-center ${draggingComponent && 'cursor-fieldpicked'}`} id="dropzone">
        <div
          style={{ minHeight: `${containerHeight}px`, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          onClick={clickOnDropArea}
          onMouseMove={mouseMoveOnDropArea}
          onMouseLeave={mouseLeaveOnDropArea}
          ref={documentRef}
        >
          <DroppedComponents
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
            zoom={zoom}
            recipients={recipients}
            onAddRecipients={onAddRecipients}
            isSigningMode={isSigningMode}
            isReadOnly={isReadOnly}
            isSigned={isSigned}
            onClickField={onClickField}
            currentRecipientId={currentRecipientId}
            guidedFieldId={guidedFieldId}
          />
          <PDFViewer
            selectedFile={selectedFile as File}
            pages={pages}
            zoom={1}
            pageRefs={pageRefs}
            generateThumbnails={(data) => generateThumbnails(data)}
            insertBlankPageAt={insertBlankPageAt}
            toggleMenu={toggleMenu}
            error={error || ''}
            isSigningMode={isSigningMode}
            isReadOnly={isReadOnly}
            signingToken={signingToken}
          />
        </div>
      </div>
    </>
  );
};

export default EditorCanvas;
