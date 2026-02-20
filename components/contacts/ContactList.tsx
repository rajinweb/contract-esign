'use client';
import React from 'react';
import { Contact } from '@/types/types';
import { Edit, Trash2, User, Building2, Mail, Phone, MapPin, Check } from 'lucide-react';

interface ContactListProps {
  contacts: Contact[];
  onEditContact: (contact: Contact) => void;
  selectedContacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onSelectAll: (selected: boolean) => void;
  onDelete: (contact: Contact) => void;
  onBulkDelete: () => void;
}

const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onEditContact,
  selectedContacts,
  onSelectContact,
  onSelectAll,
  onDelete,
  onBulkDelete,
}) => {
  const formatAddress = (address?: Contact['address']) => {
    if (!address) return '';

    const parts = [
      address.streetAddress,
      address.apartment,
      address.city,
      address.state,
      address.zipCode,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new contact.
        </p>
      </div>
    );
  }

  const isSelected = (contact: Contact) =>
    selectedContacts.some(selected => selected._id === contact._id);

  const allSelected = contacts.length > 0 && contacts.every(contact => isSelected(contact));
  const someSelected = selectedContacts.length > 0 && !allSelected;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md mt-6">

      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 h-14 flex items-center">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
          </span>
        </label>
        {selectedContacts.length > 0 && (
          <>
            <span className="ml-2 text-sm text-blue-600">
              ({selectedContacts.length} selected)
            </span>
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-3 py-2 ml-6 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        )}

      </div>

      <ul className="divide-y divide-gray-200">
        {contacts.map((contact) => (
          <li key={contact._id} className={`px-6 py-4 hover:bg-gray-50 ${isSelected(contact) ? 'bg-blue-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 mr-4">
                <input
                  type="checkbox"
                  checked={isSelected(contact)}
                  onChange={() => onSelectContact(contact)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isSelected(contact) ? 'bg-blue-200' : 'bg-blue-100'
                      }`}>
                      {isSelected(contact) ? (
                        <Check className="w-5 h-5 text-blue-600" />
                      ) : (
                        <span className="text-sm font-medium text-blue-600">
                          {contact.firstName.charAt(0)}
                          {contact.lastName.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                    {contact.companyName && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Building2 className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        {contact.companyName}
                        {contact.jobTitle && ` - ${contact.jobTitle}`}
                      </div>
                    )}
                    {contact.address && formatAddress(contact.address) && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        {formatAddress(contact.address)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEditContact(contact)}
                  className="text-blue-400 hover:text-blue-600 p-1"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(contact)}
                  className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50"
                  title="Delete contact"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactList;
