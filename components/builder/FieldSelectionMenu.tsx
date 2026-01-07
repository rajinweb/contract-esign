'use client';
import React, { useState } from 'react';
import { User, Copy, Trash2, ChevronDown, UserRoundPlus } from 'lucide-react';
import { Recipient, DroppedComponent } from '@/types/types';

interface FieldSelectionMenuProps {
  field: DroppedComponent;
  recipients: Recipient[];
  onAssignRecipient: (fieldId: number, recipientId: string | null) => void;
  onDuplicateField: (field: DroppedComponent) => void;
  onDeleteField: (field: DroppedComponent) => void;
  onAddRecipients: () => void;
}

const FieldSelectionMenu: React.FC<FieldSelectionMenuProps> = ({
  field,
  recipients,
  onAssignRecipient,
  onDuplicateField,
  onDeleteField,
  onAddRecipients,
}) => {
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const assignedRecipient = recipients.find(r => r.id === field.assignedRecipientId);
  const availableRecipients = recipients.filter(r => !r.isCC); // Only signers and approvers

  const handleRecipientSelect = (recipientId: string | null) => {
    onAssignRecipient(field.id, recipientId);
    setShowRecipientDropdown(false);
  };
  const commonClasses='shadow-lg bg-white border-gray-300 hover:bg-gray-50 border rounded-md p-2';
  return (
    <div className="absolute -top-12 left-0 right-0 z-50 flex items-center gap-2">
     
        {/* Recipient Selector */}      
          <button
            onClick={(e) =>{
              e.stopPropagation();
              setShowRecipientDropdown(!showRecipientDropdown)}
            }
            className={`flex items-center gap-2 ${commonClasses}`}
          >
            <span className="rounded-full p-0.5 text-white" style={{ backgroundColor: assignedRecipient?.color || '#6B7280' }}>
              <User size={12} />
            </span>
            <span className="flex-1 text-left text-ellipsis overflow-hidden whitespace-nowrap max-w-48" title={assignedRecipient?.name}>
              {assignedRecipient?.name || 'Unassigned'}
            </span>
            <ChevronDown size={14} />
          </button>

          {showRecipientDropdown && (
            <div className="absolute top-full left-0 mt-1 min-w-48 bg-white border border-gray-200 rounded-md shadow-lg z-60 text-xs">
               <button
                  onClick={() => handleRecipientSelect(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                    <User size={10} className="text-white" />
                  </div>
                  <span>Unassigned</span>
                </button>
              <div className="py-1 max-h-[300px] overflow-y-auto">
                {availableRecipients.map((recipient) => {
                   const isDisabled = recipient.role === 'viewer' || recipient.role === 'approver';
                   return(
                  <button
                    key={recipient.id}
                    onClick={() => !isDisabled && handleRecipientSelect(recipient.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    disabled={isDisabled}
                    title={isDisabled ? "Viewers and approvers cannot be assigned fields." : recipient.name}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: recipient.color }}
                    >
                      {recipient.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      {recipient.name}
                     <p>{recipient.email}</p>
                     </div>
                  </button>
                )}
                )}
                
              </div>
              <button className='flex items-center gap-1 p-2 w-full border-t justify-center hover:text-blue-500' title="Add Recipient" onClick={(e)=>{
                e.stopPropagation();
                onAddRecipients();
              }}><UserRoundPlus size={14} /><span>Recipient</span></button>
            </div>
          )}
      

        {/* Duplicate Button */}
        <button
          onClick={() => onDuplicateField(field)}
          className={`${commonClasses}`}
          title="Duplicate field"
        >
          <Copy size={16} className="text-gray-600" />
        </button>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            console.log(field);
            e.stopPropagation();
            onDeleteField(field)}}
          className={`${commonClasses}`}
          title="Delete field"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
  
    </div>
  );
};

export default FieldSelectionMenu;