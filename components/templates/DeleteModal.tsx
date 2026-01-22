'use client';
import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { Template } from '@/hooks/useTemplates';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocs: Template[];
  onConfirmDelete: () => void;
  permanent?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  selectedDocs,
  onConfirmDelete,
  permanent,
}) => {


  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} title={`${permanent ? 'Delete Template Permanently' : 'Move to Trash'}`} onClose={onClose}
      handleCancel={onClose}
      cancelLabel="Cancel"
      cancelClass="text-gray-700 hover:bg-gray-50"

      handleConfirm={onConfirmDelete}
      confirmClass="bg-red-600 text-white hover:bg-red-700"
      confirmLabel={
        <div className='flex items-center gap-2'>
          <Trash2 size={16} />
          {permanent ? `Delete Permanently` :  `Move to Trash`}
        </div>
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
            {permanent ? 'This action cannot be undone. You are about to permanently delete ' : 'These template will be moved to the trash and can be restored later. You are about to move '}
            <span className="font-semibold">{selectedDocs.length}</span> {' '}
            template{selectedDocs.length !== 1 ? 's' : ''}{' '}{permanent ? 'permanently' : 'to trash'}.
          </p>
        </div>
      </div>

      {/* Document List Preview */}
      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
        <p className="text-xs font-medium text-gray-700 mb-2">Documents to be {permanent ? 'permanently' : 'moved'}:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {selectedDocs.slice(0, 5).map((doc) => (
            <li key={doc._id} className="flex items-center">
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