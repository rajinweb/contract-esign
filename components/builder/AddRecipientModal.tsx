import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, PenTool, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { Contact, Recipient } from '@/types/types';
import toast from 'react-hot-toast';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
}

const RECIPIENT_COLORS = [
  '#3B82F6', // Blue
  '#F59E0B', // Orange  
  '#10B981', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange-red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const ROLES = [
  { 
    value: 'signer', 
    label: 'Signer', 
    icon: PenTool, 
    description: 'Can sign and fill out the document',
    color: '#3B82F6'
  },
  { 
    value: 'approver', 
    label: 'Approver', 
    icon: CheckCircle, 
    description: 'Can approve or reject the document',
    color: '#10B981',
    isNew: true
  },
  { 
    value: 'viewer', 
    label: 'Viewer', 
    icon: Eye, 
    description: 'Can only view the document',
    color: '#6B7280'
  },
] as const;

const AddRecipientModal: React.FC<AddRecipientModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onRecipientsChange,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);

  // Load contacts on mount
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const generateRecipientId = () => {
    return `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getNextColor = () => {
    const usedColors = recipients.map(r => r.color);
    return RECIPIENT_COLORS.find(color => !usedColors.includes(color)) || RECIPIENT_COLORS[0];
  };

  const addRecipient = (email: string, name?: string, isCC = false) => {
    if (!email) return;

    // Check if recipient already exists
    const existingRecipient = recipients.find(r => r.email === email);
    if (existingRecipient) {
      toast.error('Recipient already added');
      return;
    }

    const newRecipient: Recipient = {
      id: generateRecipientId(),
      email,
      name,
      role: 'signer',
      color: getNextColor(),
      order: recipients.length + 1,
      isCC,
    };

    if (isCC) {
      setCcRecipients(prev => [...prev, newRecipient]);
    } else {
      onRecipientsChange([...recipients, newRecipient]);
    }
  };

  const removeRecipient = (id: string, isCC = false) => {
    if (isCC) {
      setCcRecipients(prev => prev.filter(r => r.id !== id));
    } else {
      onRecipientsChange(recipients.filter(r => r.id !== id));
    }
  };

  const updateRecipientRole = (id: string, role: Recipient['role']) => {
    onRecipientsChange(
      recipients.map(r => r.id === id ? { ...r, role } : r)
    );
    setShowRoleDropdown(null);
  };

  const updateRecipientEmail = (id: string, email: string) => {
    onRecipientsChange(
      recipients.map(r => r.id === id ? { ...r, email } : r)
    );
  };

  const handleSaveAndContinue = () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    // Validate all recipients have valid emails
    const invalidRecipients = recipients.filter(r => !r.email || !r.email.includes('@'));
    if (invalidRecipients.length > 0) {
      toast.error('Please enter valid email addresses for all recipients');
      return;
    }

    onClose();
    toast.success(`${recipients.length} recipient${recipients.length > 1 ? 's' : ''} added successfully`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add recipients that need to fill out and sign this document
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              You can edit this list of recipients anytime and set the order in which they complete
              the document on the <strong>Set up and Send</strong> page.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Recipients List */}
          {recipients.map((recipient, index) => (
            <div key={recipient.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: recipient.color }}
                >
                  {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'R'}
                </div>

                {/* Recipient Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      Recipient {index + 1}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>

                  {/* Email Input */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => updateRecipientEmail(recipient.id, e.target.value)}
                        placeholder="Enter email or add from contacts"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <Users className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Role Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowRoleDropdown(showRoleDropdown === recipient.id ? null : recipient.id)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 min-w-[120px]"
                      >
                        {ROLES.find(r => r.value === recipient.role)?.icon && (
                          <ROLES.find(r => r.value === recipient.role)!.icon className="w-4 h-4" />
                        )}
                        <span>{ROLES.find(r => r.value === recipient.role)?.label}</span>
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showRoleDropdown === recipient.id && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          {ROLES.map((role) => (
                            <button
                              key={role.value}
                              onClick={() => updateRecipientRole(recipient.id, role.value)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                            >
                              <role.icon 
                                className="w-5 h-5" 
                                style={{ color: role.color }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{role.label}</span>
                                  {role.isNew && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{role.description}</p>
                              </div>
                              {recipient.role === role.value && (
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => removeRecipient(recipient.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Recipient */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                R
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">
                  Recipient {recipients.length + 1}
                </div>
                <input
                  type="email"
                  placeholder="Enter email or add from contacts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const email = (e.target as HTMLInputElement).value;
                      if (email) {
                        addRecipient(email);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => addRecipient('')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <UserPlus className="w-4 h-4" />
              Add Recipient
            </button>
            <button
              onClick={() => addRecipient('', undefined, true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <Users className="w-4 h-4" />
              Add CC Recipients
            </button>
          </div>

          {/* Contacts Integration */}
          {loadingContacts ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading contacts...</p>
            </div>
          ) : contacts.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Quick Add from Contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {contacts.slice(0, 10).map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => addRecipient(contact.email, `${contact.firstName} ${contact.lastName}`)}
                    className="flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded-md"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                      {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={handleSaveAndContinue}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRecipientModal;