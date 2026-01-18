'use client';
import Modal from '../Modal';

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
    <Modal
      visible={isVisible}
      title="Unsaved Changes"
      onClose={onCancel}
      handleCancel={onCancel}
      handleConfirm={onSaveAndContinue}
      confirmLabel="Save & Continue"
    >
      <p>You have unsaved changes.</p>
      <p>Please save your changes before sending the document to recipient(s).</p>
    </Modal>
  );
}