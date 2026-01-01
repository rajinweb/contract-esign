'use client';
import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates } from '@/hooks/useTemplates';
import { useForm, SubmitHandler } from 'react-hook-form';
import type { DocumentField, Recipient } from '@/types/types';

const CATEGORIES = ['HR', 'Legal', 'Sales', 'Finance', 'Other'];

interface SaveAsTemplateModalProps {
  documentId: string | null;
  documentName: string;
  documentFileUrl: string;
  documentFields?: DocumentField[];
  documentDefaultSigners?: Recipient[];
  documentPageCount?: number;
  documentFileSize?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormInputs {
  name: string;
  description: string;
  category: string;
  tags: string;
}

export default function SaveAsTemplateModal({
  documentId,
  documentName,
  documentFileUrl,
  documentFields = [],
  documentDefaultSigners = [],
  documentPageCount = 1,
  documentFileSize = 0,
  onClose,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const { createTemplate } = useTemplates();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInputs>({
    defaultValues: {
      name: `${documentName} Template`,
      description: '',
      category: 'Other',
      tags: '',
    },
  });

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!documentFileUrl) {
      toast.error('Document file URL is missing. Cannot create template.');
      return;
    }
    try {
      const tags = data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const result = await createTemplate({
        name: data.name,
        description: data.description,
        category: data.category,
        templateFileUrl: documentFileUrl,
        fields: documentFields,
        defaultSigners: [], // Don't include recipients in template
        pageCount: documentPageCount,
        fileSize: documentFileSize,
        tags,
        // Pass documentId to backend to find original file
        documentId: documentId,
      });

      if (result) {
        toast.success('Template saved successfully');
        onClose();
        onSuccess?.();
      } else {
        toast.error('Failed to save template');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';
      toast.error(errorMessage);
      console.error('Error saving template:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Save as Template</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Template name is required' })}
              placeholder="e.g., NDA Agreement"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
               {...register('description')}
              placeholder="Describe what this template is used for..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (Optional)
            </label>
            <input
              type="text"
              {...register('tags')}
              placeholder="Comma-separated tags (e.g., legal, contract, urgent)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add tags to make your template easier to find
            </p>
          </div>

          {/* Document Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Document:</span> {documentName}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium">Pages:</span> {documentPageCount}
            </p>
            {documentFields.length > 0 && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Fields:</span> {documentFields.length}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Recipients will not be included in the template.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
