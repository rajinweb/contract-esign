'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, FileText, Send, CheckCircle, X } from 'lucide-react';
import { IDocumentVersion, DocumentVersionsProps } from '@/types/types';

const DocumentVersions: React.FC<DocumentVersionsProps> = ({
  documentId,
  currentVersion,
  onVersionSelect,
}) => {
  const [versions, setVersions] = useState<IDocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4 text-gray-500" />;
      case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
      case 'signed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired': return <X className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'signed': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Document Versions</h3>
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.version}
            className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
              version.version === currentVersion ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => onVersionSelect?.(version.version)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(version.status ?? 'draft')}
                <div>
                  <p className="font-medium text-gray-900">
                    Version {version.version}
                    {version.version === currentVersion && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{version.changeLog}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(version.status ?? 'draft')}`}>
                  {(version.status ?? 'draft').charAt(0).toUpperCase() + (version.status ?? 'draft').slice(1)}
                </span>
                {version.sentAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sent: {new Date(version.sentAt).toLocaleDateString()}
                  </p>
                )}
                {version.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(version.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentVersions;
