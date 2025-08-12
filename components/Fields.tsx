import React from 'react';
import {
  Image as Pic,
  Signature,
  Type,
  Calendar,
  BadgeCheck,
  UserCircle,
  Mail,
  CheckSquare,
  CircleDot,
  Paperclip,
  ChevronDown,
  Stamp,
  FunctionSquare,
} from 'lucide-react';

import {FieldsProps} from '@/types/types';

const fieldTypes = [
  { id: 'signature', icon: <Signature size={18} />, label: 'Signature' },
  { id: 'image', icon: <Pic size={18} />, label: 'Image' },
  { id: 'text', icon: <Type size={18} />, label: 'Text' },
  { id: 'Date', icon: <Calendar size={18} />, label: 'Date and Time' },
  { id: 'BadgeCheck', icon: <BadgeCheck size={18} />, label: 'Initials' },
  { id: 'UserCircle',  icon: <UserCircle size={18} />, label: 'Full Name' },
  { id: 'Mail', icon: <Mail size={18} />, label: 'Email' },
  { id: 'CheckSquare', icon: <CheckSquare size={18} />, label: 'Checkbox' },
  { id: 'CircleDot', icon: <CircleDot size={18} />, label: 'Radio Buttons' },
  { id: 'Paperclip', icon: <Paperclip size={18} />, label: 'Attachment' },
  { id: 'ChevronDown', icon: <ChevronDown size={18} />, label: 'Dropdown' },
  { id: 'Stamp', icon: <Stamp size={18} />, label: 'Stamp' },
  { id: 'FunctionSquare', icon: <FunctionSquare size={18} />, label: 'Formula' },
];

export default function Fields({ activeComponent, mouseDown }: FieldsProps) {
 
  return (
    <div className="w-72 p-4 border-r border-gray-200 space-y-5 bg-white select-none">
      
        <small className="text-sm text-gray-800 uppercase">Add Fields for the recipient by placing them on the document: </small>
        <div className="flex space-x-4 mt-2 text-sm font-semibold border-b border-gray-200 -mx-4 px-4">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">Default</div>
          <div className="text-gray-500 cursor-pointer">Custom</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {fieldTypes.map((field) => (
            <div
              key={field.id}
              className={`flex items-center justify-start p-2 bg-blue-50 rounded hover:bg-blue-100 transition text-sm ${
                activeComponent == field.label && 'hover:bg-blue-200 bg-blue-300'
              }`}
              onMouseDown={(event) => mouseDown(field.label, event)}
            >
              {field.icon}
              <span className="ml-2">{field.label}</span>
            </div>
          ))}
        </div>
     

    </div>
  );
}
