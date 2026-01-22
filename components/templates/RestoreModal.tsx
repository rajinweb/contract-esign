'use client';
import React, { useState } from 'react';
import { History, AlertTriangle } from 'lucide-react';
import { Template } from '@/hooks/useTemplates';
import toast from 'react-hot-toast';
import Modal from '../Modal';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplates: Template[];
  onRestoreComplete: (restoredIds: string[]) => void;
}

const RestoreTemplateModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  selectedTemplates,
  onRestoreComplete,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (selectedTemplates.length === 0) return;

    setIsRestoring(true);
    try {
      const templateIds = selectedTemplates.map(template => template._id);

      const response = await fetch('/api/templates/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('AccessToken') || ''}`
        },
        body: JSON.stringify({ templateIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to restore templates');
      }

      toast.success(result.message);
      onRestoreComplete(templateIds);
      onClose();
    } catch (error) {
      console.error('Error restoring templates:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore templates');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} title='Restore Templates' onClose={onClose} handleCancel={onClose} handleConfirm={handleRestore}
      confirmClass="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      confirmDisabled={isRestoring || selectedTemplates.length === 0}
      confirmLabel={
        isRestoring ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Restoring...
          </>
        ) : (
          <>
            <History className="w-4 h-4 mr-2" />
            Restore {selectedTemplates.length} Template{selectedTemplates.length !== 1 ? 's' : ''}
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
            <span className="font-semibold">{selectedTemplates.length}</span>{' '}
            template{selectedTemplates.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default RestoreTemplateModal;
