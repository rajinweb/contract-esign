'use client';
import React, { useState } from 'react';
import { User, Copy, Trash2, ChevronDown } from 'lucide-react';
import { Recipient, DroppedComponent } from '@/types/types';

interface FieldSelectionMenuProps {
  field: DroppedComponent;
  recipients: Recipient[];
  onAssignRecipient: (fieldId: number, recipientId: string | null) => void;
  onDuplicateField: (field: DroppedComponent) => void;
  onDeleteField: (field: DroppedComponent) => void;
}

const FieldSelectionMenu: React.FC<FieldSelectionMenuProps> = ({
  field,
  recipients,
  onAssignRecipient,
  onDuplicateField,
  onDeleteField,
}) => {
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const assignedRecipient = recipients.find(r => r.id === field.assignedRecipientId);
  const availableRecipients = recipients.filter(r => !r.isCC); // Only signers and approvers

  const handleRecipientSelect = (recipientId: string | null) => {
    onAssignRecipient(field.id, recipientId);
    setShowRecipientDropdown(false);
  };

  return (
    <div className="absolute -top-12 left-0 right-0 z-50">
      <div className="flex items-center bg-white border border-gray-300 rounded-md shadow-lg">
        {/* Recipient Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-sm border-r border-gray-300 hover:bg-gray-50 min-w-[140px]"
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
              style={{ backgroundColor: assignedRecipient?.color || '#6B7280' }}
            >
              <User size={12} />
            </div>
            <span className="flex-1 text-left">
              {assignedRecipient?.name || 'Unassigned'}
            </span>
            <ChevronDown size={14} />
          </button>

          {showRecipientDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-60">
              <div className="py-1">
                <button
                  onClick={() => handleRecipientSelect(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                    <User size={10} className="text-white" />
                  </div>
                  <span>Unassigned</span>
                </button>
                {availableRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    onClick={() => handleRecipientSelect(recipient.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: recipient.color }}
                    >
                      {recipient.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{recipient.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Duplicate Button */}
        <button
          onClick={() => onDuplicateField(field)}
          className="p-2 border-r border-gray-300 hover:bg-gray-50"
          title="Duplicate field"
        >
          <Copy size={16} className="text-gray-600" />
        </button>

        {/* Delete Button */}
        <button
          onClick={() => onDeleteField(field)}
          className="p-2 hover:bg-gray-50"
          title="Delete field"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default FieldSelectionMenu;