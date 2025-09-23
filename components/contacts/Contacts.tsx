'use client';
import React, { useState, useEffect } from 'react';
import { Contact } from '@/types/types';
import AddContactModal from '@/components/contacts/AddContactModal';
import ContactList from '@/components/contacts/ContactList';
import BulkImportModal from '@/components/contacts/BulkImportModal';
import BulkDeleteModal from '@/components/contacts/BulkDeleteModal';
import { Users, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useContextStore from '@/hooks/useContextStore';

interface SearchQueryProps  {
  searchQuery: string;
};
const Contacts: React.FC<SearchQueryProps> = ({ searchQuery }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const {showModal, setShowModal} = useContextStore()
  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery?.trim()) {
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
    setShowModal(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleDeleteContact = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c._id !== contactId));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContact(null);
  };

  const handleImportComplete = () => {
    fetchContacts(); // Refresh the contacts list
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c._id === contact._id);
      if (isSelected) {
        return prev.filter(c => c._id !== contact._id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedContacts(filteredContacts);
    } else {
      setSelectedContacts([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select contacts to delete');
      return;
    }
    setShowBulkDelete(true);
  };

  const handleDeleteComplete = (deletedIds: string[]) => {
    setContacts(prev => prev.filter(c => !deletedIds.includes(c._id!)));
    setSelectedContacts([]);
    setBulkMode(false);
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedContacts([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
     <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl  text-gray-900">All Contacts</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your contact information for document signing
              </p>
            </div>
            <div className="ml-4 flex items-center gap-4">
              {!bulkMode ? (
                <button
                  onClick={toggleBulkMode}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Bulk Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedContacts.length === 0}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedContacts.length})
                  </button>
                  <button
                    onClick={toggleBulkMode}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500">
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
          selectedContacts={selectedContacts}
          onSelectContact={handleSelectContact}
          onSelectAll={handleSelectAll}
          bulkMode={bulkMode}
        />

        {/* Add/Edit Contact Modal */}
        {showModal && (
        <AddContactModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onContactAdded={handleContactAdded}
          editContact={editingContact}
        />
        )}

        {/* Bulk Import Modal */}
        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            handleImportComplete();
            setShowBulkImport(false);
          }}
        />

        {/* Bulk Delete Modal */}
        <BulkDeleteModal
          isOpen={showBulkDelete}
          onClose={() => setShowBulkDelete(false)}
          selectedContacts={selectedContacts}
          onDeleteComplete={handleDeleteComplete}
        />
    </>
  );
};

export default Contacts;