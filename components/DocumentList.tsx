'use client';
import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Doc} from '@/types/types';

interface DocumentListProps {
  documents: Doc[];
  onDocumentSelect: (doc: Doc) => void;
}

const statusIcons = {
  shared: Clock,
  to_sign: AlertCircle,
  signed: CheckCircle,
  cancelled: XCircle,
  expired: Clock,
};

const statusColors = {
  shared: 'text-blue-500',
  to_sign: 'text-yellow-500',
  signed: 'text-green-500',
  cancelled: 'text-red-500',
  expired: 'text-gray-500',
};

export default function DocumentList({
  documents,
  onDocumentSelect,
}: DocumentListProps) {
  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const StatusIcon = statusIcons[doc.status];
        const statusColor = statusColors[doc.status];

        return (
          <div
            key={doc.id}
            className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onDocumentSelect(doc)}
          >
            <FileText className="w-6 h-6 text-gray-500 mr-4" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{doc.name}</h3>
              <p className="text-sm text-gray-500">
                Created {doc.createdAt.toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center">
              <StatusIcon className={`w-5 h-5 ${statusColor}`} />
              <span className={`ml-2 text-sm capitalize ${statusColor}`}>
                {doc.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
