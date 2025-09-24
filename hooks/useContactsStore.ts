import { useState, useCallback, useEffect } from 'react';
import { Contact } from '@/types/types';
import toast from 'react-hot-toast';

interface ContactsStore {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
  deleteContacts: (contactIds: string[]) => void;
  revalidateContacts: () => Promise<void>;
}

export const useContactsStore = (): ContactsStore => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const addContact = useCallback((contact: Contact) => {
    setContacts(prev => [contact, ...prev]);
  }, []);

  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts(prev => 
      prev.map(contact => 
        contact._id === updatedContact._id ? updatedContact : contact
      )
    );
  }, []);

  const deleteContact = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(contact => contact._id !== contactId));
  }, []);

  const deleteContacts = useCallback((contactIds: string[]) => {
    setContacts(prev => prev.filter(contact => !contactIds.includes(contact._id!)));
  }, []);

  const revalidateContacts = useCallback(async () => {
    await fetchContacts();
  }, [fetchContacts]);

  // Initial fetch
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    deleteContacts,
    revalidateContacts,
  };
};