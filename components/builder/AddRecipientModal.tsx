'use client';
import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Users, CheckCircle, Trash2, Edit, CircleQuestionMark } from 'lucide-react';
import { Contact, Recipient, ROLES } from '@/types/types';
import toast from 'react-hot-toast';
import DropdownPortal from '../DropdownPortal';
import Input from '../forms/Input';
import { Button } from '../Button';
import Modal from '../Modal';
import { validateEmail } from '@/utils/utils';
import CreatableSelect from 'react-select/creatable';
import { StylesConfig } from 'react-select';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
}

const RECIPIENT_COLORS = [
  '#3B82F6', // Bluea
  '#F59E0B', // Orange
  '#10B981', // Green
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange-red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const AddRecipientModal: React.FC<AddRecipientModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onRecipientsChange,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [draftRecipients, setDraftRecipients] = useState<Recipient[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const generateRecipientId = () => `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sortedRecipients = [...draftRecipients].sort((a, b) => {
    if (a.isCC === b.isCC) return a.order - b.order;
    return a.isCC ? 1 : -1; // CC goes to bottom
  });
  const normalRecipients = sortedRecipients.filter(r => !r.isCC);

  const getNextColor = (currentRecipients: Recipient[]) => {
    const usedColors = currentRecipients.map(r => r.color);
    return RECIPIENT_COLORS.find(color => !usedColors.includes(color)) || RECIPIENT_COLORS[0];
  };

  const generateUniqueName = (baseName: string, existingNames: string[]): string => {
    let finalName = baseName.trim();
    if (existingNames.includes(finalName)) {
      let counter = 2;
      while (existingNames.includes(`${finalName} ${counter}`)) {
        counter++;
      }
      finalName = `${finalName} ${counter}`;
    }
    return finalName;
  };

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      const initialRecipients = recipients.length === 0
        ? [{
          id: generateRecipientId(),
          email: '',
          name: 'Recipient 1',
          role: 'signer' as Recipient['role'],
          color: getNextColor([]),
          order: 1,
          isCC: false,
          totalFields: 0,
          status: 'pending' as Recipient['status']
        }]
        : recipients;
      setDraftRecipients(initialRecipients);
      setFormErrors({}); // Clear previous errors when modal opens
    }
  }, [isOpen, recipients]);


  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    const processedRecipients = sortedRecipients.map(r => ({
      ...r,
      email: r.email.trim(),
      name: r.name?.trim(),
    }));

    const emailCounts: { [key: string]: number } = {};
    processedRecipients.forEach(r => {
      if (r.email) {
        const lowerEmail = r.email.toLowerCase();
        emailCounts[lowerEmail] = (emailCounts[lowerEmail] || 0) + 1;
      }
    });

    const nameCounts: { [key: string]: number } = {};
    processedRecipients.forEach(r => {
      if (r.name) {
        const lowerName = r.name.toLowerCase();
        nameCounts[lowerName] = (nameCounts[lowerName] || 0) + 1;
      }
    });

    processedRecipients.forEach(r => {
      // Validate Email
      if (!r.email) {
        errors[`${r.id}_email`] = 'Email is required';
      } else if (!validateEmail(r.email)) {
        errors[`${r.id}_email`] = 'Invalid email format';
      } else if (emailCounts[r.email.toLowerCase()] > 1) {
        errors[`${r.id}_email`] = 'Duplicate email';
      }

      // Validate Name (Alias)
      if (!r.name) {
        errors[`${r.id}_name`] = 'Alias is required';
      } else if (nameCounts[r.name.toLowerCase()] > 1) {
        errors[`${r.id}_name`] = 'Duplicate alias';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
    } finally {
      setLoadingContacts(false);
    }
  };

  type ContactOption = { value: string; label: string; contact?: Contact };

  const contactOptions: ContactOption[] = contacts.map(contact => ({
    value: contact.email.toLowerCase(),
    label: `${contact.firstName} ${contact.lastName}`.trim()
      ? `${contact.firstName} ${contact.lastName}`.trim() + ` ${contact.email}`
      : contact.email,
    contact,
  }));

  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;

  const getSelectStyles = (hasError: boolean): StylesConfig<ContactOption, false> => ({
    control: (base, state) => ({
      ...base,
      minHeight: '36px',
      borderColor: hasError ? '#EF4444' : state.isFocused ? '#3B82F6' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
      '&:hover': { borderColor: hasError ? '#EF4444' : state.isFocused ? '#3B82F6' : '#9CA3AF' },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 1000001 }),
  });

  const formatContactOptionLabel = (option: ContactOption) => {
    if (!option.contact) {
      return <span className="text-sm text-gray-900">{option.label}</span>;
    }
    const name = `${option.contact.firstName} ${option.contact.lastName}`.trim();
    return (
      <div className="flex flex-col">
        <span className="text-sm text-gray-900">{name || option.contact.email}</span>
        <span className="text-xs text-gray-500">{option.contact.email}</span>
      </div>
    );
  };

  const addRecipient = (isCC = false) => {
    setDraftRecipients(prev => {
      const existingNames = prev.map(r => r.name);
      const defaultName = `Recipient ${prev.length + 1}`;
      const finalName = generateUniqueName(defaultName, existingNames);

      const newRecipient: Recipient = {
        id: generateRecipientId(),
        email: '',
        name: finalName,
        role: isCC ? 'viewer' : 'signer',
        color: getNextColor(prev),
        order: prev.length + 1,
        isCC,
        totalFields: 0,
        status: 'pending' as Recipient['status']
      };
      return [...prev, newRecipient];
    });
  };
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [sortedRecipients]);
  const removeRecipient = (id: string) => {
    setDraftRecipients(prev => prev.filter(r => r.id !== id).map((r, idx) => ({ ...r, order: idx + 1 })));
    setTimeout(validateForm, 0); // Re-validate after state update
  };

  const updateRecipient = (id: string, updates: Partial<Recipient>) => {
    setDraftRecipients(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleAliasBlur = (id: string) => {
    setEditingAlias(null);
    const recipient = sortedRecipients.find(r => r.id === id);
    if (recipient) {
      const trimmedName = recipient?.name.trim();
      if (!trimmedName) {
        const existingNames = sortedRecipients.filter(r => r.id !== id).map(r => r.name);
        const defaultName = `Recipient ${recipient.order}`;
        updateRecipient(id, { name: generateUniqueName(defaultName, existingNames) });
      } else {
        updateRecipient(id, { name: trimmedName });
      }
    }
    setTimeout(validateForm, 0);
  };

  const handleEmailBlur = (id: string) => {
    const recipient = sortedRecipients.find(r => r.id === id);
    if (recipient) {
      updateRecipient(id, { email: recipient.email.trim() });
    }
    setTimeout(validateForm, 0);
  };

  const toggleAliasEdit = (id: string) => {
    setEditingAlias(editingAlias === id ? null : id);
    setTimeout(() => inputRefs.current[id]?.focus(), 0);
  };

  const selectContactForRecipient = (recipientId: string, contact: Contact) => {
    const recipient = sortedRecipients.find(r => r.id === recipientId);
    if (!recipient) return;

    // Clear validation error for email + name
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${recipientId}_email`];
      delete newErrors[`${recipientId}_name`];
      return newErrors;
    });

    let nameToUpdate = recipient.name;
    const isDefaultOrEmptyName = /^Recipient\s\d+$/.test(recipient.name.trim()) || recipient.name.trim() === '';

    if (isDefaultOrEmptyName) {
      const contactName = `${contact.firstName} ${contact.lastName}`.trim();
      const existingNames = sortedRecipients.filter(r => r.id !== recipientId).map(r => r.name);
      nameToUpdate = generateUniqueName(contactName, existingNames);
    }

    updateRecipient(recipientId, { email: contact.email, name: nameToUpdate });

  };


  const handleSaveAndContinue = () => {
    // Trim all fields before final validation
    const trimmedRecipients = sortedRecipients.map(r => ({
      ...r,
      email: r.email.trim(),
      name: r.name.trim(),
    }));
    setDraftRecipients(trimmedRecipients);

    setTimeout(() => {
      if (!validateForm()) {
        toast.error('Please fix the errors before continuing');
        return;
      }

      onRecipientsChange(trimmedRecipients);
      onClose();
      toast.success(`${trimmedRecipients.length} recipient${trimmedRecipients.length > 1 ? 's' : ''} added successfully`);
    }, 100); // Small delay to allow state to update
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen}
      onClose={onClose}
      handleConfirm={handleSaveAndContinue}
      confirmLabel="Save and Continue"
      className='w-[800px]' title={
        <>
          <h2 className="text-xl font-semibold text-gray-900">
            Add Recipients {sortedRecipients.length}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            You can edit this list of recipients anytime and Send page.
          </p>
        </>
      }>

      <div ref={scrollContainerRef}>
        {sortedRecipients.map((recipient) => {
          const hasNameError = !!formErrors[`${recipient.id}_name`];
          const hasEmailError = !!formErrors[`${recipient.id}_email`];

          return (
            <div className={`flex gap-4 p-4 border-b border-gray-100 rounded-md ${recipient.isCC ? 'bg-gray-100' : ''}`} key={recipient.id}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white mt-8"
                style={{ backgroundColor: recipient.color }}
              >
                {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'R'}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {editingAlias === recipient.id ? (
                    <Input
                      ref={el => { inputRefs.current[recipient.id] = el; }}
                      type="text"
                      value={recipient.name}
                      onChange={e => updateRecipient(recipient.id, { name: e.target.value })}
                      onBlur={() => handleAliasBlur(recipient.id)}
                      onKeyDown={e => e.key === 'Enter' && handleAliasBlur(recipient.id)}
                      className={` border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasNameError ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900 flex gap-1 items-center" title='This person will receive a notification once is complete'>{recipient.isCC && 'CC'} {recipient.name}  {recipient.isCC && <CircleQuestionMark size={14} />} </span>
                  )}
                  <button onClick={() => toggleAliasEdit(recipient.id)} className="text-gray-400 hover:text-gray-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  {hasNameError && <span className="text-red-500 text-xs">{formErrors[`${recipient.id}_name`]}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CreatableSelect<ContactOption, false>
                      instanceId={`contact-select-${recipient.id}`}
                      isClearable
                      isSearchable
                      isLoading={loadingContacts}
                      placeholder="Select or type email"
                      options={contactOptions}
                      formatOptionLabel={formatContactOptionLabel}
                      getOptionValue={(option) => option.value}
                      value={
                        recipient.email
                          ? contactOptions.find(option => option.value === recipient.email.toLowerCase())
                            ?? { value: recipient.email, label: recipient.email }
                          : null
                      }
                      onChange={(option) => {
                        if (!option) {
                          updateRecipient(recipient.id, { email: '' });
                          return;
                        }
                        if (option.contact) {
                          selectContactForRecipient(recipient.id, option.contact);
                          return;
                        }
                        updateRecipient(recipient.id, { email: option.value });
                      }}
                      onInputChange={(inputValue, actionMeta) => {
                        if (actionMeta.action === 'input-change') {
                          updateRecipient(recipient.id, { email: inputValue });
                        }
                      }}
                      onBlur={() => handleEmailBlur(recipient.id)}
                      formatCreateLabel={(inputValue) => `Use \"${inputValue}\"`}
                      isValidNewOption={(inputValue) => validateEmail(inputValue)}
                      noOptionsMessage={() => loadingContacts ? 'Loading...' : 'No contacts found'}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                      styles={getSelectStyles(hasEmailError)}
                    />
                  </div>
                  {!recipient.isCC && (
                    <div className="relative">
                      <button
                        id={`role-button-${recipient.id}`}
                        onClick={() => setShowRoleDropdown(showRoleDropdown === recipient.id ? null : recipient.id)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 min-w-[150px]"
                      >
                        {(() => {
                          const roleDef = ROLES.find(r => r.value === recipient.role);
                          if (!roleDef) return null;
                          const Icon = roleDef.icon;
                          return <><Icon className="w-4 h-4" /><span>{roleDef.label}</span></>;
                        })()}
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>

                      {showRoleDropdown === recipient.id && (
                        <DropdownPortal targetId={`role-button-${recipient.id}`} dropdown={showRoleDropdown} onClose={() => setShowRoleDropdown(null)}>
                          <div className="bg-white border border-gray-200 rounded-md shadow-lg w-64">
                            {ROLES.map(role => (
                              <button key={role.value} onClick={() => { updateRecipient(recipient.id, { role: role.value }); setShowRoleDropdown(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                                <role.icon className="w-5 h-5" style={{ color: role.color }} />
                                <div>
                                  <span className='text-sm'>{role.label}</span>
                                  <p className="text-xs text-gray-500">{role.description}</p>
                                </div>
                                {recipient.role === role.value && <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        </DropdownPortal>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => removeRecipient(recipient.id)}
                    disabled={normalRecipients.length === 1 && !recipient.isCC}
                    className={`p-2 text-gray-400 hover:text-red-600 ${normalRecipients.length === 1 && !recipient.isCC ? 'pointer-events-none opacity-50' : ''
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
                {hasEmailError && <span className="text-red-500 text-xs pb-1">{formErrors[`${recipient.id}_email`]}</span>}
              </div>
            </div>
          );
        })}

      </div>
      {/* Action Buttons */}
      <div className="flex items-center gap-4 absolute bottom-5">
        <Button
          onClick={() => addRecipient(false)}
          icon={<UserPlus size={16} />}
          inverted
          className='border-0'
          label='Add Recipient'
        />
        {!sortedRecipients.some(r => r.isCC) && (
          <Button
            onClick={() => addRecipient(true)}
            label='Add CC Recipients'
            inverted
            icon={<Users size={16} />}
            className='border-0'
          />
        )}
      </div>
    </Modal>
  );
};

export default AddRecipientModal;
