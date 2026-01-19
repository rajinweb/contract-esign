'use client';
import React, { useState } from 'react';
import { History, AlertTriangle } from 'lucide-react';
import { Doc } from '@/types/types';
import toast from 'react-hot-toast';
import Modal from '../Modal';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocs: Doc[];
  onRestoreComplete: (restoredIds: string[]) => void;
}

const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  selectedDocs,
  onRestoreComplete,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {

    if (selectedDocs.length === 0) return;

    setIsRestoring(true);
    try {
      const documentIds = selectedDocs.map(doc => doc.id);

      const response = await fetch('/api/documents/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to restore documents');
      }

      toast.success(result.message);
      onRestoreComplete(documentIds);
      onClose();
    } catch (error) {
      console.error('Error restoring documents:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore documents');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} title='Restore Documents' onClose={onClose} handleCancel={onClose} handleConfirm={handleRestore}
      confirmClass="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      confirmDisabled={isRestoring || selectedDocs.length === 0}
      confirmLabel={
        isRestoring ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Restoring...
          </>
        ) : (
          <>
            <History className="w-4 h-4 mr-2" />
            Restore {selectedDocs.length} Document{selectedDocs.length !== 1 ? 's' : ''}
          </>
        )}
    >
      <div className="flex items-center">
        <AlertTriangle className="w-12 h-12 text-blue-500" />
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            Are you sure?
          </h3>
          <p className="text-sm text-gray-500">
            You are about to restore{' '}
            <span className="font-semibold">{selectedDocs.length}</span>{' '}
            document{selectedDocs.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

    </Modal>
  );
};

export default RestoreModal;