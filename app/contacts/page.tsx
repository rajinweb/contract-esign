'use client';
import React, { useState, useEffect } from 'react';
import { Contact } from '@/types/types';
import AddContactModal from '@/components/contacts/AddContactModal';
import ContactList from '@/components/contacts/ContactList';
import { Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter((contact) =>
        `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.companyName || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [contacts, searchQuery]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleContactAdded = (contact: Contact) => {
    if (editingContact) {
      // Update existing contact
      setContacts((prev) =>
        prev.map((c) => (c._id === contact._id ? contact : c))
      );
      setEditingContact(null);
    } else {
      // Add new contact
      setContacts((prev) => [contact, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleDeleteContact = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c._id !== contactId));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your contact information for document signing
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="ml-4 flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Contact List */}
        <ContactList
          contacts={filteredContacts}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
        />

        {/* Add/Edit Contact Modal */}
        <AddContactModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onContactAdded={handleContactAdded}
          editContact={editingContact}
        />
      </div>
    </div>
  );
};

export default ContactsPage;