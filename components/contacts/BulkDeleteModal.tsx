'use client';
import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Contact } from '@/types/types';
import toast from 'react-hot-toast';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Contact[];
  onDeleteComplete: (deletedIds: string[]) => void;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  selectedContacts,
  onDeleteComplete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (selectedContacts.length === 0) return;

    setIsDeleting(true);
    try {
      const contactIds = selectedContacts.map(contact => contact._id).filter(Boolean);
      
      const response = await fetch('/api/contacts/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete contacts');
      }

      toast.success(result.message);
      onDeleteComplete(contactIds as []);
      onClose();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete contacts');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-md w-full bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Delete Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || selectedContacts.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteModal;