'use client'
import toast from 'react-hot-toast';
import { useTemplates } from '@/hooks/useTemplates';
import { useForm, SubmitHandler } from 'react-hook-form';
import type { DocumentField } from '@/types/types';
import Modal from './Modal';

const CATEGORIES = ['HR', 'Legal', 'Sales', 'Finance', 'Other'];

interface SaveAsTemplateModalProps {
  documentId: string | null;
  documentName: string;
  documentFileUrl: string;
  documentFields?: DocumentField[];
  documentFieldCount?: number;
  getDocumentFields?: () => DocumentField[];
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
  documentFieldCount,
  getDocumentFields,
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
      const fieldsToPersist = getDocumentFields ? getDocumentFields() : documentFields;

      const result = await createTemplate({
        name: data.name,
        description: data.description,
        category: data.category,
        templateFileUrl: documentFileUrl,
        fields: fieldsToPersist,
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
  const visibleFieldCount = documentFieldCount ?? documentFields.length;

  return (
      <Modal visible={true} 
      title="Save as Template"
          onClose={onClose} 
          handleConfirm={handleSubmit(onSubmit)}
          confirmLabel={isSubmitting ? 'Saving...' : 'Save Template'}
          confirmDisabled={isSubmitting}  
          >
        {/* Form */}
        <form className="space-y-3">
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
            {visibleFieldCount > 0 && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Fields:</span> {visibleFieldCount}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Recipients will not be included in the template.
            </p>
          </div>

         
        </form>
      
    </Modal>
  );
}
