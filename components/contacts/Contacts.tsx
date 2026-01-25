'use client';
import React, { useState, useEffect } from 'react';
import AddContactModal from '@/components/contacts/AddContactModal';
import ContactList from '@/components/contacts/ContactList';
import BulkImportModal from '@/components/contacts/BulkImportModal';
import DeleteModal from '@/components/contacts/DeleteModal';
import toast from 'react-hot-toast';
import useContextStore from '@/hooks/useContextStore';
import { useContactsStore } from '@/hooks/useContactsStore';
import { Contact } from '@/types/types';
import { Users, LoaderPinwheel } from 'lucide-react';

const Contacts = ({ searchQuery }: { searchQuery: string }) => {
  const {
    contacts,
    loading,
    addContact,
    updateContact,
    deleteContact,
    deleteContacts,
    revalidateContacts,
  } = useContactsStore();

  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const { showModal, setShowModal } = useContextStore();

  // Listen for contact updates from other components
  useEffect(() => {
    const handleContactsUpdated = () => {
      revalidateContacts();
    };
    window.addEventListener('contactsUpdated', handleContactsUpdated);
    return () => {
      window.removeEventListener('contactsUpdated', handleContactsUpdated);
    };
  }, [revalidateContacts]);

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

  const handleContactAdded = (contact: Contact) => {
    if (editingContact) {
      // Update existing contact
      updateContact(contact);
      setEditingContact(null);
    } else {
      // Add new contact
      addContact(contact);
    }
    setShowModal(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleDeleteSingleContact = (contact: Contact) => {
    setSelectedContacts([contact]);
    setIsDeleting(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContact(null);
  };
  
  const handleBulkDelete = () => {
    setIsDeleting(true);
  };

  const handleImportComplete = () => {
    revalidateContacts(); // Refresh the contacts list
    setShowBulkImport(false); // Close the modal  
    // Also trigger global contact update event for other components
    window.dispatchEvent(new CustomEvent('contactsUpdated'));
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c._id === contact._id);
      if (isSelected) {
        return prev.filter((c) => c._id !== contact._id);
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

  const handleDeleteComplete = (deletedIds: string[]) => {
    deleteContacts(deletedIds);
    setSelectedContacts([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
            <LoaderPinwheel className="absolute z-10 animate-spin left-1/2 top-1/2 " size="40" color="#2563eb" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-gray-900">All Contacts ({contacts.length})</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your contact information for document signing</p>
            </div>
            <div className="ml-4 flex items-center gap-4">
            <div className="flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </div>
            </div>
      </div>

        <ContactList
          contacts={filteredContacts}
          onEditContact={handleEditContact}
          selectedContacts={selectedContacts}
          onSelectContact={handleSelectContact}
          onSelectAll={handleSelectAll}
          onDelete={handleDeleteSingleContact}
          onBulkDelete={handleBulkDelete}
        />

      {showModal && (
        <AddContactModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onContactAdded={handleContactAdded}
          editContact={editingContact}
        />
      )}

        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            handleImportComplete();
            setShowBulkImport(false);
          }}
        />

        <DeleteModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          selectedContacts={selectedContacts}
          onDeleteComplete={handleDeleteComplete}
        />
    </>
  );
};

export default Contacts;