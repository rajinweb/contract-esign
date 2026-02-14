'use client';
import React, { useState, useCallback } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Contact } from '@/types/types';
import Modal from '../Modal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Contact[];
  onDeleteComplete: (deletedIds: string[]) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  onDeleteComplete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (selectedContacts.length === 0) return;

    setIsDeleting(true);
    try {
      const contactIds = selectedContacts.map(contact => contact._id).filter(Boolean) as string[];
      await onDeleteComplete(contactIds); // Pass only the IDs
      onClose(); // Close modal on success
    } catch (error) {
      // Error is already handled in the store, but you could add specific modal feedback if needed
      console.error('An error occurred during deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedContacts, onDeleteComplete, onClose]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} onClose={onClose}
      title="Delete Contacts" className="w-[400px]"
      handleConfirm={handleDelete}
      confirmLabel={
        isDeleting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
          </>
        )
      }
      confirmDisabled={isDeleting}
      confirmClass={`bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${isDeleting && '[&_span]:animate-spin'}`}
    >
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            Are you sure?
          </h3>
          <p className="text-sm text-gray-500">
            This action cannot be undone. You are about to delete{' '}
            <span className="font-semibold">{selectedContacts.length}</span>{' '}
            contact{selectedContacts.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* Contact List Preview */}
      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
        <p className="text-xs font-medium text-gray-700 mb-2">Contacts to be deleted:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {selectedContacts.slice(0, 5).map((contact) => (
            <li key={contact._id} className="flex items-center">
              <Trash2 className="w-3 h-3 mr-2 text-red-400" />
              {contact.firstName} {contact.lastName} ({contact.email})
            </li>
          ))}
          {selectedContacts.length > 5 && (
            <li className="text-gray-500 italic">
              ... and {selectedContacts.length - 5} more
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
};

export default DeleteModal;