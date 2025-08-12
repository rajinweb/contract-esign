import React from 'react';
import {
  Pencil,
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

const fieldOptions = [
  { icon: <Signature size={18} />, label: 'Signature' },
  { icon: <Type size={18} />, label: 'Text' },
  { icon: <Calendar size={18} />, label: 'Date and Time' },
  { icon: <BadgeCheck size={18} />, label: 'Initials' },
  { icon: <UserCircle size={18} />, label: 'Full Name' },
  { icon: <Mail size={18} />, label: 'Email' },
  { icon: <CheckSquare size={18} />, label: 'Checkbox' },
  { icon: <CircleDot size={18} />, label: 'Radio Buttons' },
  { icon: <Paperclip size={18} />, label: 'Attachment' },
  { icon: <ChevronDown size={18} />, label: 'Dropdown' },
  { icon: <Stamp size={18} />, label: 'Stamp' },
  { icon: <FunctionSquare size={18} />, label: 'Formula' },
];

const FieldTypes: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold">Recipients: 1 <span className="float-right text-sm text-blue-600 cursor-pointer">Manage Recipients</span></h2>
      <div className="mt-4">
        <p className="text-sm font-medium">SELECT A RECIPIENT FOR WHOM YOU NEED TO ADD OR REQUEST DATA:</p>
        <div className="flex items-center mt-2 space-x-2">
          <Pencil size={16} className="text-blue-600" />
          <span className="text-sm font-semibold">Me (Fill Out Now)</span>
        </div>

        <div className="mt-2 p-2 border rounded flex items-center bg-blue-100 cursor-pointer">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">R</div>
          <div className="ml-2">
            <div className="text-sm font-medium">Recipient 1</div>
            <div className="text-xs text-gray-500">0 fields</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">ADD FIELDS FOR THIS RECIPIENT BY PLACING THEM ON THE DOCUMENT:</p>
        <div className="flex space-x-4 mt-2 text-sm font-semibold">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">Default</div>
          <div className="text-gray-500 cursor-pointer">Custom</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {fieldOptions.map((field) => (
            <button
              key={field.label}
              className="flex items-center justify-start p-2 bg-blue-50 rounded hover:bg-blue-100 transition text-sm"
            >
              {field.icon}
              <span className="ml-2">{field.label}</span>
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default FieldTypes;
