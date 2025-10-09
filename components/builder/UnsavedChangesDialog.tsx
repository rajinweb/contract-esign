'use client';
import React from 'react';
import { Dialog } from '../Dialog'; // Assuming Dialog component is in ../Dialog

interface UnsavedChangesDialogProps {
  isVisible: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
}

export function UnsavedChangesDialog({
  isVisible,
  onCancel,
  onSaveAndContinue,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      isVisible={isVisible}
      title="Unsaved Changes"
      onCancel={onCancel}
      onConfirm={onSaveAndContinue}
      confirmTitle="Save & Continue"
    >
      <p>You have unsaved changes.</p>
      <p>Please save your changes before sending the document to recipient(s).</p>
    </Dialog>
  );
}