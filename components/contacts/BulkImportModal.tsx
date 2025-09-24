'use client';
import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  const downloadTemplate = () => {
    const csvContent = `firstName,lastName,email,phone,companyName,jobTitle,country,streetAddress,apartment,city,state,zipCode,description
John,Doe,john.doe@example.com,+1234567890,Acme Corp,Software Engineer,US,123 Main St,Apt 1,New York,NY,10001,Sample contact
Jane,Smith,jane.smith@example.com,+0987654321,Tech Solutions,Project Manager,US,456 Oak Ave,,Los Angeles,CA,90210,Another sample contact`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      toast.success(result.message);
      onImportComplete();
      
      // Reset form and close modal
      setFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import contacts');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-2xl w-full max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col p-1">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-xs font-medium text-blue-800">Import Instructions</h3>
                <div className="mt-2 text-xs text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Upload a CSV file with contact information</li>
                    <li>Required columns: firstName, lastName, email</li>
                    <li>Optional columns: phone, companyName, jobTitle, address fields, description</li>
                    <li>Duplicate emails will be skipped</li>
                  </ul>
                </div>
              </div>
            </div>
             <Image src="/images/csv-sample.png" width={2240} height={432} className='shadow-lg mt-3' alt={'csv-sample'}/>
          </div>

          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Download Template</p>
                <p className="text-sm text-gray-500">Get a sample CSV file with the correct format</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <p className="text-sm font-medium text-green-800">{file.name}</p>
                <p className="text-xs text-green-600">
                  {(file.size / 1024).toFixed(1)} KB • Ready to import
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-900">
                  Drop your CSV file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500">CSV files only, up to 10MB</p>
              </div>
            )}
          </div>

          {/* CSV Format Example */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Expected CSV Format:</h4>
            <div className="bg-white p-3 rounded border text-xs font-mono overflow-x-auto">
              <div className="text-gray-600">firstName,lastName,email,phone,companyName,jobTitle</div>
              <div className="text-gray-800">John,Doe,john@example.com,+1234567890,Acme Corp,Engineer</div>
              <div className="text-gray-800">Jane,Smith,jane@example.com,+0987654321,Tech Co,Manager</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;