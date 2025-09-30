'use client';
import React, { useState } from 'react';
import { X, User, PenTool, CheckCircle, Eye } from 'lucide-react';
import { Recipient, DroppedComponent } from '@/types/types';

interface FieldAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: DroppedComponent;
  recipients: Recipient[];
  onAssignField: (fieldId: number, recipientId: string | null) => void;
}

const FieldAssignmentModal: React.FC<FieldAssignmentModalProps> = ({
  isOpen,
  onClose,
  field,
  recipients,
  onAssignField,
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    field.assignedRecipientId || null
  );

  const handleAssign = () => {
    onAssignField(field.id, selectedRecipientId);
    onClose();
  };

  if (!isOpen) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'signer': return <PenTool className="w-4 h-4" />;
      case 'approver': return <CheckCircle className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Field</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign this {field.component.toLowerCase()} field to a recipient
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Field Info */}
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: '#3B82F6' }}
              >
                {field.component.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{field.component} Field</p>
                <p className="text-sm text-gray-500">
                  Page {field.pageNumber || 1} • Position ({Math.round(field.x)}, {Math.round(field.y)})
                </p>
              </div>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Assign to Recipient
            </label>

            {/* Unassigned Option */}
            <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="recipient"
                value=""
                checked={selectedRecipientId === null}
                onChange={() => setSelectedRecipientId(null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="ml-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Unassigned</p>
                  <p className="text-xs text-gray-500">Anyone can fill this field</p>
                </div>
              </div>
            </label>

            {/* Recipients */}
            {recipients.filter(r => !r.isCC).map((recipient) => (
              <label
                key={recipient.id}
                className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="recipient"
                  value={recipient.id}
                  checked={selectedRecipientId === recipient.id}
                  onChange={() => setSelectedRecipientId(recipient.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: recipient.color }}
                  >
                    {recipient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{recipient.email}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {getRoleIcon(recipient.role)}
                        <span className="capitalize">{recipient.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Assign Field
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldAssignmentModal;