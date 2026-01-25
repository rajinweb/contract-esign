import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Contact } from '@/types/types';

export const useContactsStore = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/contacts');

      if (response.status === 401) {
        // User is not authenticated, silently fail and clear contacts
        setContacts([]);
        return;
      }

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
    setContacts((prev) => [contact, ...prev]);
  }, []);

  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts((prev) =>
      prev.map((contact) => (contact._id === updatedContact._id ? updatedContact : contact))
    );
  }, []);

  const deleteContact = useCallback(async (contactId: string) => {
    const originalContacts = contacts;
    try {
      // Optimistically remove the contact from the UI
      setContacts((prev) => prev.filter((contact) => contact._id !== contactId));

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      toast.success('Contact deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
      // Revert to the original state if the API call fails
      setContacts(originalContacts);
    }
  }, [contacts]);

  const deleteContacts = useCallback(async (contactIds: string[]) => {
    const originalContacts = contacts;
    try {
      // Optimistically remove the contacts from the UI
      setContacts((prev) => prev.filter((contact) => contact._id && !contactIds.includes(contact._id)));

      const response = await fetch('/api/contacts/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete contacts');
      }

      toast.success('Contacts deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
      // Revert to the original state if the API call fails
      setContacts(originalContacts);
    }
  }, [contacts]);

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