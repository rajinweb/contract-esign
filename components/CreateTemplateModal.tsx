'use client';
import React, { useState, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates } from '@/hooks/useTemplates';
import { useForm, SubmitHandler } from 'react-hook-form';
import type { Doc } from '@/types/types';
import Modal from './Modal';
import { Button } from './Button';

const CATEGORIES = ['HR', 'Legal', 'Sales', 'Finance', 'Other'];

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormInputs {
  name: string;
  description: string;
  category: string;
  tags: string;
}

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTemplateModalProps) {
  const { createTemplate, uploadTemplate, fetchTemplates } = useTemplates();
  const [activeTab, setActiveTab] = useState<'document' | 'upload'>('document');
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormInputs>({
    defaultValues: {
      name: '',
      description: '',
      category: 'Other',
      tags: '',
    },
  });

  const watchedName = watch('name');

  // Fetch documents for "Select Existing Document" tab
  useEffect(() => {
    if (!isOpen) return;

    const fetchDocuments = async () => {
      setDocsLoading(true);
      try {
        const res = await fetch('/api/documents/list', { credentials: 'include' });
        if (res.ok) {
          const { documents: data } = await res.json();
          setDocuments(data.filter((item: { status: string; }) => item.status !== 'trashed') || []);
        } else {
          console.error('Failed to fetch documents');
          setDocuments([]);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };

    fetchDocuments();
  }, [isOpen]);

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(selectedDocId === docId ? null : docId);

    // Auto-fill template name from document name
    const selectedDoc = documents.find(d => d.id === docId);
    if (selectedDoc) {
      reset({
        ...{
          category: 'Other',
          description: '',
          tags: '',
        },
        name: `${selectedDoc.name} Template`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setUploadedFile(file);
      // Auto-fill template name from file name
      const fileName = file.name.replace('.pdf', '');
      reset({
        ...{
          category: 'Other',
          description: '',
          tags: '',
        },
        name: `${fileName} Template`,
      });
    }
  };

  const onSubmitDocument: SubmitHandler<FormInputs> = async (data) => {
    if (!selectedDocId) {
      toast.error('Please select a document');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const result = await createTemplate({
        name: data.name,
        description: data.description,
        category: data.category,
        tags,
        documentId: selectedDocId,
      });

      if (result) {
        toast.success('Template created from document successfully');
        await fetchTemplates();
        onClose();
        onSuccess?.();
        reset();
        setSelectedDocId(null);
      } else {
        toast.error('Failed to create template from document');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(errorMessage);
      console.error('Error creating template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitUpload: SubmitHandler<FormInputs> = async (data) => {
    if (!uploadedFile) {
      toast.error('Please select a PDF file to upload');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const result = await uploadTemplate(uploadedFile, {
        name: data.name,
        description: data.description,
        category: data.category,
        tags,
      });

      if (result) {
        toast.success('Template uploaded successfully');
        await fetchTemplates();
        onClose();
        onSuccess?.();
        reset();
        setUploadedFile(null);
      } else {
        toast.error('Failed to upload template');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(errorMessage);
      console.error('Error uploading template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} onClose={onClose} title="Create Template" width='600px'>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6 gap-4 justify-center">
        <button
          onClick={() => setActiveTab('document')}
          className={`px-2  transition-colors border-b-2 ${activeTab === 'document'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Select Existing Document
          </div>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-2 transition-colors border-b-2 ${activeTab === 'upload'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload New Template
          </div>
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'document' && (
          <form
            onSubmit={handleSubmit(onSubmitDocument)}
            className="p-6 space-y-4"
          >
            {/* Document Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Document <span className="text-red-500">*</span>
              </label>
              {docsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No documents found</p>
                  <p className="text-sm">
                    Upload or create a document first to convert it to a template
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDocumentSelect(doc.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selectedDocId === doc.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="font-medium text-gray-900">{doc.name}</div>
                      <div className="text-sm text-gray-600">
                        Status: {doc.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Details */}
            {selectedDocId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name', {
                      required: 'Template name is required',
                    })}
                    placeholder="e.g., NDA Agreement"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('tags')}
                    placeholder="Comma-separated tags (e.g., legal, contract)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add tags to make your template easier to find
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            {selectedDocId && (
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  label='Cancel'
                  inverted
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  label={isSubmitting ? 'Creating...' : 'Create Template'}
                />
              </div>
            )}
          </form>
        )}

        {activeTab === 'upload' && (
          <form
            onSubmit={handleSubmit(onSubmitUpload)}
            className="p-6 space-y-4"
          >
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload PDF File <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                </label>
                {uploadedFile && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-blue-700">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Template Details */}
            {uploadedFile && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name', {
                      required: 'Template name is required',
                    })}
                    placeholder="e.g., NDA Agreement"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('tags')}
                    placeholder="Comma-separated tags (e.g., legal, contract)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add tags to make your template easier to find
                  </p>
                </div>
              </>
            )}
             {/* Actions */}
              {uploadedFile && (
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button
                      
                    onClick={onClose}
                    inverted
                    label='Cancel'
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    label={isSubmitting ? 'Uploading...' : 'Upload Template'}
                  />
                </div>
              )}
          </form>
        )}
      </div>
    </Modal>
  );
}
