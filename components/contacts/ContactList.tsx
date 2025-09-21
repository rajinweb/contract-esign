'use client';
import React, { useState } from 'react';
import { Contact } from '@/types/types';
import { Edit, Trash2, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContactListProps {
  contacts: Contact[];
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onEditContact,
  onDeleteContact,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (contact: Contact) => {
    if (!contact._id) return;
    
    if (!confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      return;
    }

    setDeletingId(contact._id);
    try {
      const response = await fetch(`/api/contacts/${contact._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      onDeleteContact(contact._id);
      toast.success('Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {contacts.map((contact) => (
          <li key={contact._id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {contact.firstName.charAt(0)}
                        {contact.lastName.charAt(0)}
                      </span>
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
                  className="text-gray-400 hover:text-blue-600 p-1"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(contact)}
                  disabled={deletingId === contact._id}
                  className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
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