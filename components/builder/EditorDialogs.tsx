'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { DroppedComponent, DroppingField, Recipient } from '@/types/types';

const AddRecipientModal = dynamic(() => import('./AddRecipientModal'), { ssr: false });
const SendDocumentModal = dynamic(() => import('./SendDocumentModal'), { ssr: false });
const LivePhotoDialog = dynamic(
  () => import('@/components/builder/LivePhotoDialog').then((mod) => mod.LivePhotoDialog),
  { ssr: false }
);
const UserItems = dynamic(() => import('@/components/builder/UserItems'), { ssr: false });
const RecipientItems = dynamic(() => import('./RecipientItems'), { ssr: false });

interface EditorDialogsProps {
  isSigningMode: boolean;
  isReadOnly: boolean;
  showAddRecipients: boolean;
  setShowAddRecipients: React.Dispatch<React.SetStateAction<boolean>>;
  recipients: Recipient[];
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>;
  droppedComponents: DroppedComponent[];
  showSendDocument: boolean;
  setShowSendDocument: React.Dispatch<React.SetStateAction<boolean>>;
  documentName: string;
  documentId?: string | null;
  onSendComplete: (payload: { recipients: Recipient[]; signingMode: 'sequential' | 'parallel' }) => void;
  photoDialog: boolean;
  setPhotoDialog: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFieldForDialog: DroppedComponent | null;
  updateField: (data: string | null, id: number) => void;
  canvasFields: boolean;
  setCanvasFields: React.Dispatch<React.SetStateAction<boolean>>;
  draggingComponent: DroppingField | null;
}

const EditorDialogs: React.FC<EditorDialogsProps> = ({
  isSigningMode,
  isReadOnly,
  showAddRecipients,
  setShowAddRecipients,
  recipients,
  setRecipients,
  droppedComponents,
  showSendDocument,
  setShowSendDocument,
  documentName,
  documentId,
  onSendComplete,
  photoDialog,
  setPhotoDialog,
  selectedFieldForDialog,
  updateField,
  canvasFields,
  setCanvasFields,
  draggingComponent,
}) => {
  return (
    <>
      {photoDialog && (
        <LivePhotoDialog
          onClose={() => setPhotoDialog(false)}
          onConfirm={(data: string) => {
            if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
            setPhotoDialog(false);
          }}
        />
      )}
      {canvasFields && draggingComponent?.fieldOwner === "me" && (
        <UserItems
          onClose={() => setCanvasFields(false)}
          onAdd={(value) => {
            if (selectedFieldForDialog) {
              updateField(value.value, selectedFieldForDialog.id);
            }
          }}
          component={selectedFieldForDialog}
        />
      )}
      {canvasFields && isSigningMode && draggingComponent?.fieldOwner !== "me" && (
        <RecipientItems
          component={draggingComponent as DroppingField}
          value={selectedFieldForDialog?.data ?? null}
          onAdd={(value) => {
            if (selectedFieldForDialog) {
              updateField(value.value, selectedFieldForDialog.id);
            }
          }}
          onClose={() => setCanvasFields(false)}
        />
      )}
      {!isSigningMode && !isReadOnly && (
        <>
          {showAddRecipients && (
            <AddRecipientModal
              isOpen={showAddRecipients}
              onClose={() => setShowAddRecipients(false)}
              recipients={recipients}
              onRecipientsChange={setRecipients}
            />
          )}

          {showSendDocument && (
            <SendDocumentModal
              isOpen={showSendDocument}
              onClose={() => setShowSendDocument(false)}
              recipients={recipients}
              fields={droppedComponents}
              documentName={documentName}
              documentId={documentId}
              setRecipients={setRecipients}
              onSendComplete={onSendComplete}
            />
          )}
        </>
      )}
    </>
  );
};

export default EditorDialogs;
