'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Users, PenTool, CheckCircle, Eye, Trash2, Edit } from 'lucide-react';
import { Contact, Recipient } from '@/types/types';
import toast from 'react-hot-toast';
import DropdownPortal from '../DropdownPortal';
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
    color: '#3B82F6',
    isNew: false
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
    color: '#6B7280',
    isNew: false
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
  const [showContactsDropdown, setShowContactsDropdown] = useState<string | null>(null);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasErrors, setAliasErrors] = useState<{[key: string]: string}>({});
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const [draftRecipients, setDraftRecipients] = useState<Recipient[]>([]);

  // Load contacts on mount
  useEffect(() => {
    if (isOpen) {
      loadContacts();
      // initialize draft from saved recipients
      setDraftRecipients(recipients);
      setShowContactsDropdown(null);
      setShowRoleDropdown(null);
      setNewEmail('');
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
    const usedColors = draftRecipients.map(r => r.color);
    return RECIPIENT_COLORS.find(color => !usedColors.includes(color)) || RECIPIENT_COLORS[0];
  };

  const addRecipient = (email: string = '', name?: string, isCC = false) => {
    if (email && draftRecipients.find(r => r.email === email)) {
      toast.error('Recipient already added');
      return;
    }

    // Generate unique name if not provided
    const generateUniqueName = (baseName: string, existingNames: string[]): string => {
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      let counter = 2;
      let newName = `${baseName} ${counter}`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
      }
      return newName;
    };

    const existingNames = draftRecipients.map(r => r.name).filter(Boolean) as string[];
    const defaultName = `Recipient ${draftRecipients.length + 1}`;
    const finalName = name ? generateUniqueName(name, existingNames) : generateUniqueName(defaultName, existingNames);

    const newRecipient: Recipient = {
      id: generateRecipientId(),
      email,
      name: finalName,
      role: 'signer',
      color: getNextColor(),
      order: draftRecipients.length + 1,
      isCC,
    };

    if (isCC) {
      setCcRecipients(prev => [...prev, newRecipient]);
    } else {
      setDraftRecipients(prev => [...prev, newRecipient]);
    }
  };

  const removeRecipient = (id: string, isCC = false) => {
    if (isCC) {
      setCcRecipients(prev => prev.filter(r => r.id !== id));
    } else {
      setDraftRecipients(prev => prev.filter(r => r.id !== id).map((r, idx) => ({ ...r, order: idx + 1 })));
    }
  };

  const updateRecipientRole = (id: string, role: Recipient['role']) => {
    setDraftRecipients(prev => prev.map(r => r.id === id ? { ...r, role } : r));
    setShowRoleDropdown(null);
  };

  const updateRecipientEmail = (id: string, email: string) => {
    setDraftRecipients(prev => prev.map(r => r.id === id ? { ...r, email } : r));
  };

  const updateRecipientName = (id: string, name: string) => {
    // Validate alias
    const trimmedName = name.trim();
    const errors: {[key: string]: string} = {};
    
    if (!trimmedName) {
      errors[id] = 'Alias cannot be blank';
    } else {
      // Check for duplicates
      const duplicateCount = draftRecipients.filter(r => r.id !== id && r.name === trimmedName).length;
      if (duplicateCount > 0) {
        errors[id] = 'Alias already exists';
      }
    }
    
    setAliasErrors(prev => ({ ...prev, [id]: errors[id] || '' }));
    
    if (!errors[id]) {
      setDraftRecipients(prev => prev.map(r => r.id === id ? { ...r, name: trimmedName } : r));
    }
  };

  const handleAliasBlur = (id: string) => {
    console.log('handleAliasBlur', id);
    setEditingAlias(null);
    const currentName = draftRecipients.find(r => r.id === id)?.name;
    if (!currentName || !currentName.trim()) {
      // Generate unique default name if blank
      const generateUniqueName = (baseName: string, existingNames: string[]): string => {
        if (!existingNames.includes(baseName)) {
          return baseName;
        }
        let counter = 2;
        let newName = `${baseName} ${counter}`;
        while (existingNames.includes(newName)) {
          counter++;
          newName = `${baseName} ${counter}`;
        }
        return newName;
      };

      const index = draftRecipients.findIndex(r => r.id === id);
      const existingNames = draftRecipients.filter(r => r.id !== id).map(r => r.name).filter(Boolean) as string[];
      const defaultName = `Recipient ${index + 1}`;
      const uniqueName = generateUniqueName(defaultName, existingNames);
      
      setDraftRecipients(prev => prev.map(r => r.id === id ? { ...r, name: uniqueName } : r));
    }
  };

  const toggleAliasEdit = (id: string) => {
    setEditingAlias(editingAlias === id ? null : id);
    // Focus the input after state update
    setTimeout(() => {
      inputRefs.current[id]?.focus();
    }, 0);
  };

  const selectContactForRecipient = (recipientId: string, contact: Contact) => {
    setDraftRecipients(prev => prev.map(r => 
      r.id === recipientId 
        ? { ...r, email: contact.email, name: `${contact.firstName} ${contact.lastName}` }
        : r
    ));
    setShowContactsDropdown(null);
  };

  const handleSaveAndContinue = () => {
    // if (draftRecipients.length === 0) {
    //   toast.error('Please add at least one recipient');
    //   return;
    // }

    // Validate all recipients have valid emails
    const invalidRecipients = draftRecipients.filter(r => !r.email || !r.email.includes('@'));
    if (invalidRecipients.length > 0) {
      toast.error('Please enter valid email addresses for all recipients');
      return;
    }

    onRecipientsChange(draftRecipients);
    onClose();
    toast.success(`${draftRecipients.length} recipient${draftRecipients.length > 1 ? 's' : ''} added successfully`);
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
          {draftRecipients.map((recipient, index) => (
            <div key={recipient.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                  style={{ backgroundColor: recipient.color }}
                >
                  {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'R'}
                </div>

                {/* Recipient Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {editingAlias === recipient.id ? (
                      <input
                        ref={(el) => { inputRefs.current[recipient.id] = el; }}
                        type="text"
                        value={recipient.name ?? `Recipient ${index + 1}`}
                        onChange={(e) => updateRecipientName(recipient.id, e.target.value)}
                        onBlur={() => handleAliasBlur(recipient.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAliasBlur(recipient.id);
                          }
                        }}
                        className="font-medium text-gray-900 bg-white border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">
                        {recipient.name ?? `Recipient ${index + 1}`}
                      </span>
                    )}
                    <button 
                      onClick={() => toggleAliasEdit(recipient.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {aliasErrors[recipient.id] && (
                      <span className="text-red-500 text-xs">{aliasErrors[recipient.id]}</span>
                    )}
                  </div>

                  {/* Email Input */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        id={`email-input-${recipient.id}`}
                        type="email"
                        value={recipient.email}
                        onChange={(e) => {
                          updateRecipientEmail(recipient.id, e.target.value);
                          if (e.target.value.length > 0) {
                            setShowContactsDropdown(recipient.id);
                          }
                        }}
                        placeholder="Enter email or add from contacts"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button 
                        onClick={() => setShowContactsDropdown(showContactsDropdown === recipient.id ? null : recipient.id)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <Users className="w-4 h-4" />
                      </button>

                      {/* Contacts Dropdown */}
                      {showContactsDropdown === recipient.id && (
                      <DropdownPortal targetId={`email-input-${recipient.id}`} dropdown={showContactsDropdown}>
                        <div className="bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {loadingContacts ? (
                            <div className="p-3 text-center text-gray-500">Loading contacts...</div>
                          ) : contacts.length > 0 ? (
                            contacts
                              .filter((contact) => {
                                const q = (recipient.email || '').toLowerCase();
                                if (!q) return true;
                                const name = `${contact.firstName} ${contact.lastName}`.toLowerCase();
                                return contact.email.toLowerCase().includes(q) || name.includes(q);
                              })
                              .map((contact) => (
                              <button
                                key={contact._id}
                                onClick={() => selectContactForRecipient(recipient.id, contact)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
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
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">No contacts found</div>
                          )}
                        </div>
                      </DropdownPortal>
                      )}
                    </div>

                    {/* Role Dropdown */}
                    <div className="relative">
                      <button
                        id={`role-button-${recipient.id}`}
                        onClick={() => setShowRoleDropdown(showRoleDropdown === recipient.id ? null : recipient.id)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 min-w-[120px]"
                      >
                        {(() => {
                          const roleDef = ROLES.find(r => r.value === recipient.role);
                          const Icon = roleDef?.icon;
                          return (
                            <>
                              {Icon && <Icon className="w-4 h-4" />}
                              <span>{roleDef?.label}</span>
                            </>
                          );
                        })()}
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showRoleDropdown === recipient.id && (
                      <DropdownPortal targetId={`role-button-${recipient.id}`} dropdown={showRoleDropdown}>
                        <div className="bg-white border border-gray-200 rounded-md shadow-lg w-64">
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
                                  <span className='text-sm'>{role.label}</span>
                                  {role?.isNew && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{role.description}</p>
                              </div>
                              {recipient.role === role.value && (
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      </DropdownPortal>
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

          {/* Add New Recipient - Only show if no recipients exist */}
          {draftRecipients.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                R
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">
                    Add your first recipient
                </div>
                  <div className="relative">
                <input
                  id="email-input-new"
                  type="email"
                  placeholder="Enter email or add from contacts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (e.target.value.length > 0) {
                      setShowContactsDropdown('new');
                    }
                  }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                          const email = (e.target as HTMLInputElement).value;
                          if (email) {
                            addRecipient(email);
                            (e.target as HTMLInputElement).value = '';
                            setNewEmail('');
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => setShowContactsDropdown(showContactsDropdown === 'new' ? null : 'new')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Users className="w-4 h-4" />
                    </button>

                    {showContactsDropdown === 'new' && (
                      <DropdownPortal targetId="email-input-new" dropdown={showContactsDropdown}>
                        <div className="bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {loadingContacts ? (
                            <div className="p-3 text-center text-gray-500">Loading contacts...</div>
                          ) : contacts.length > 0 ? (
                            contacts
                              .filter((contact) => {
                                const q = newEmail.toLowerCase();
                                if (!q) return true;
                                const name = `${contact.firstName} ${contact.lastName}`.toLowerCase();
                                return contact.email.toLowerCase().includes(q) || name.includes(q);
                              })
                              .map((contact) => (
                              <button
                                key={contact._id}
                                onClick={() => {
                                  addRecipient(contact.email, `${contact.firstName} ${contact.lastName}`);
                                  setShowContactsDropdown(null);
                                  setNewEmail('');
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
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
                              ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">No contacts found</div>
                          )}
                        </div>
                      </DropdownPortal>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}       
          </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t">
          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => addRecipient()}
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