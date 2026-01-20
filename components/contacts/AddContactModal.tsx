'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Contact } from '@/types/types';
import toast from 'react-hot-toast';
import Input from '../forms/Input';
import Modal from '../Modal';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded: (contact: Contact) => void;
  editContact?: Contact | null;
}

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  jobTitle: string;
  country: string;
  streetAddress: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
};

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onContactAdded,
  editContact,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: editContact
      ? {
        firstName: editContact.firstName,
        lastName: editContact.lastName,
        email: editContact.email,
        phone: editContact.phone || '',
        companyName: editContact.companyName || '',
        jobTitle: editContact.jobTitle || '',
        country: editContact.address?.country || '',
        streetAddress: editContact.address?.streetAddress || '',
        apartment: editContact.address?.apartment || '',
        city: editContact.address?.city || '',
        state: editContact.address?.state || '',
        zipCode: editContact.address?.zipCode || '',
        description: editContact.description || '',
      }
      : {},
  });

  const onSubmit = async (data: ContactFormData, addAnother = false) => {
    setIsSubmitting(true);
    setSaveAndAddAnother(addAnother);

    try {
      const contactData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        address: {
          country: data.country,
          streetAddress: data.streetAddress,
          apartment: data.apartment,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
        description: data.description,
      };

      const url = editContact ? `/api/contacts/${editContact._id}` : '/api/contacts';
      const method = editContact ? 'PUT' : 'POST';

      const token = localStorage.getItem('AccessToken');

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save contact');
      }

      const result = await response.json();
      onContactAdded(result.contact);

      toast.success(
        editContact ? 'Contact updated successfully' : 'Contact added successfully'
      );

      if (addAnother && !editContact) {
        reset();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
      setSaveAndAddAnother(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} onClose={onClose} title={editContact ? 'Edit Contact' : 'Add Contact'} width='700px'
      handleConfirm={handleSubmit((data) => onSubmit(data, false))}
      confirmDisabled={isSubmitting}
      confirmLabel={isSubmitting && !saveAndAddAnother
        ? 'Saving...'
        : editContact
          ? 'Update Contact'
          : 'Save Contact'}>
      <form className="flex-1 p-4 -m-4 space-y-6">


        {/* Basic Information */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h3 className=" text-blue-500 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. John"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                placeholder="e.g. johnsmith@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                An email is required to create a contact.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('phone')}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Company Information */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className=" text-blue-500 mb-3">Company information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <Input
                type="text"
                placeholder="Enter a company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('companyName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <Input
                type="text"
                placeholder="Enter a job title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('jobTitle')}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className=" text-blue-500 mb-3">Address</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country / Region
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('country')}
              >
                <option value="">Nothing Selected</option>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <Input
                type="text"
                placeholder="E.g. 123 Main Avenue"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('streetAddress')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apartment, Suite, Unit, Building, Floor, etc.
              </label>
              <Input
                type="text"
                placeholder="E.g. Apt #7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('apartment')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City / Town
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Boston"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('city')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State / Region / Province
                </label>
                <Input
                  type="text"
                  placeholder="Enter state, region or province"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('state')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP / Postal Code
              </label>
              <Input
                type="text"
                placeholder="E.g. 02101 or 02101-1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('zipCode')}
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className=" text-blue-500 mb-3">Additional Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('description')}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddContactModal;