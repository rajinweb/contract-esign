'use client';
import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Doc } from '@/types/types';
import toast from 'react-hot-toast';
import Modal from '../Modal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocs: Doc[];
  onDeleteComplete: (deletedIds: string[]) => void;
  permanent?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  selectedDocs,
  onDeleteComplete,
  permanent,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const hasCompleted = selectedDocs.some((doc) => doc.status === 'completed');
  const hasInProgress = selectedDocs.some((doc) => doc.status === 'in_progress');
  const blockPermanentDelete = Boolean(permanent && hasCompleted);

  const handleDelete = async () => {
    if (selectedDocs.length === 0) return;
    if (blockPermanentDelete) {
      toast.error('Completed documents cannot be permanently deleted.');
      return;
    }

    setIsDeleting(true);
    try {
      const documentIds = selectedDocs.map(doc => doc.id);

      const response = await fetch(`/api/documents/delete${permanent ? `?permanent=${permanent}` : ''}`, {
        method: permanent ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });   

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to move documents to trash');
      }

      toast.success(result.message);
      onDeleteComplete(documentIds);
      onClose();
    } catch (error) {
      console.error('Error moving documents to trash:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to move documents to trash');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} title={`${permanent ? 'Delete Documents Permanently' : 'Move to Trash'}`} onClose={onClose}
      handleCancel={onClose}
      cancelLabel="Cancel"
      cancelDisabled={isDeleting}
      cancelClass="text-gray-700 hover:bg-gray-50"

      handleConfirm={handleDelete}
      confirmDisabled={isDeleting || blockPermanentDelete}
      confirmClass="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      confirmLabel={
        isDeleting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {permanent ? 'Deleting...' : 'Moving...'}
          </>
        ) : (
          <div className='flex items-center gap-2'>
            <Trash2 size={16} />
            {permanent ? `Delete Permanently` :  `Move to Trash`}
          </div>
        )
      }>
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            {permanent ? 'Are you sure?' : 'Move to trash?'} 
          </h3>
          <p className="text-sm text-gray-500">
            {permanent ? 'This action cannot be undone. You are about to permanently delete ' : 'These documents will be moved to the trash and can be restored later. You are about to move '}
            <span className="font-semibold">{selectedDocs.length}</span> {' '}
            document{selectedDocs.length !== 1 ? 's' : ''}{' '}{permanent ? 'permanently' : 'to trash'}.
          </p>
          {hasCompleted && !permanent && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Completed documents are immutable but can be moved to trash (soft delete).
            </div>
          )}
          {hasInProgress && !permanent && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              In-progress documents will be voided before moving to trash.
            </div>
          )}
          {blockPermanentDelete && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              Completed documents are immutable and cannot be permanently deleted.
            </div>
          )}
        </div>
      </div>

      {/* Document List Preview */}
      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
        <p className="text-xs font-medium text-gray-700 mb-2">Documents to be {permanent ? 'permanently' : 'moved'}:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {selectedDocs.slice(0, 5).map((doc) => (
            <li key={doc.id} className="flex items-center">
              <Trash2 className="w-3 h-3 mr-2 text-red-400" />
              {doc.name}
            </li>
          ))}
          {selectedDocs.length > 5 && (
            <li className="text-gray-500 italic">
              ... and {selectedDocs.length - 5} more
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
};

export default DeleteModal;
