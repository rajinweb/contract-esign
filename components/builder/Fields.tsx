import React, { useState } from 'react';
import {
  Image as Pic,
  Signature,
  Type,
  Calendar,
  BadgeCheck,
  UserCircle,
  // Mail,
  // CheckSquare,
  // CircleDot,
  // Paperclip,
  // ChevronDown,
  // FunctionSquare,
  Stamp,
  Camera,
} from 'lucide-react';

import {FieldsProps} from '@/types/types';

const fieldTypes = [
  { id: 'signature', icon: <Signature size={18} />, label: 'Signature' },
  { id: 'image', icon: <Pic size={18} />, label: 'Image' },
  { id: 'text', icon: <Type size={18} />, label: 'Text' },
  { id: 'date', icon: <Calendar size={18} />, label: 'Date' },
  { id: 'badgeCheck', icon: <BadgeCheck size={18} />, label: 'Initials' },
  { id: 'userCircle',  icon: <UserCircle size={18} />, label: 'Full Name' },
  { id: 'stamp', icon: <Stamp size={18} />, label: 'Stamp' },
  { id: 'live-photo', icon: <Camera size={18} />, label: 'Live Photo' },
  // { id: 'Mail', icon: <Mail size={18} />, label: 'Email' },
  // { id: 'CheckSquare', icon: <CheckSquare size={18} />, label: 'Checkbox' },
  // { id: 'CircleDot', icon: <CircleDot size={18} />, label: 'Radio Buttons' },
  // { id: 'Paperclip', icon: <Paperclip size={18} />, label: 'Attachment' },
  // { id: 'ChevronDown', icon: <ChevronDown size={18} />, label: 'Dropdown' },
  // { id: 'FunctionSquare', icon: <FunctionSquare size={18} />, label: 'Formula' },
];

export default function Fields({ activeComponent, mouseDown }: FieldsProps) {
  const [activeTab, setActiveTab] = useState('recipients');

  return (
    <>
      <div className="bg-gray-50 border-b p-4 pb-0 text-xs">
        Add Fields for the recipient by placing them on the document: 
      <div className="-mx-4 grid grid-cols-2 mt-4 px-4 text-center">
        <div
          className={`pb-1 cursor-pointer ${
            activeTab === 'recipients'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('recipients')}
        >
          Recipients
        </div>
        <div
          className={`pb-1 cursor-pointer ${
            activeTab === 'me'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('me')}
        >
          Me (Fill out now)
        </div>
      </div>  
      </div>    
      <div className="grid grid-cols-2 gap-3 p-4">
        {fieldTypes.map((field) => (
          <div
            key={field.id}
            className={`flex items-center justify-start p-2 rounded transition text-sm ${
              activeComponent === field.label
                ? activeTab === 'me'
                  ? 'bg-gray-300 hover:bg-gray-200'
                  : 'bg-blue-300 hover:bg-blue-200'
                : activeTab === 'me'
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-blue-50 hover:bg-blue-100'
            }`}
            onMouseDown={(event) => mouseDown(field.label, event, activeTab)}
          >
            {field.icon}
            <span className="ml-2">{field.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
