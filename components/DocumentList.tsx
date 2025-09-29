'use client';
import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  SearchX,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Doc, statuses} from '@/types/types';

interface DocumentListProps {
  documents: Doc[];
  onDocumentSelect: (doc: Doc) => void;
  onDelete?: (doc: Doc) => void;
}

const statusIcons: Record<Doc['status'], React.ElementType> = {
  unfinished: Clock,
  waiting_for_me: AlertCircle,
  waiting_for_others: AlertCircle,
  signed: CheckCircle,
  pending: Clock,
  draft: FileText,
  declined: XCircle,
  expired: Clock,
  delivery_failed: AlertTriangle,
}

export default function DocumentList({
  documents,
  onDocumentSelect,
  onDelete
}: DocumentListProps) {
   if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
       <SearchX size={50}/>
        <p className="text-lg font-medium">No documents found</p>
        <p className="text-sm">Try adjusting your filters or search query.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const statusObj=statuses.find(item => item?.value == doc.status)
        const StatusIcon = statusIcons[doc.status];
        const statusColor = statusObj?.color;
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
            {onDelete && (
              <button
                className="text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation(); // avoid opening builder
                  onDelete(doc);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

                {/* Add this below */}
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm mt-1 inline-block"
                    onClick={e => e.stopPropagation()} // Prevents triggering onDocumentSelect
                  >
                    View / Download
                  </a>
                )}
              {StatusIcon &&  <StatusIcon className={`w-5 h-5 ${statusColor}`} /> }             
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
