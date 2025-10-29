'use client';
import React, {useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Save,
  View,
  SendHorizontal,
  FileCheck,
  PenTool,
  Ban,
  ThumbsUp,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Doc, statuses} from '@/types/types';
import PdfThumbnail from '@/components/PdfThumbnails';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import toast from 'react-hot-toast';
import Filters from './dashboard/Filters';
import { useFilteredDocs } from '@/hooks/useFilteredDocs';
import BulkDeleteModal from './documents/BulkDeleteModal';
interface DocumentListProps {
    searchQuery: string;
}

const statusIcons: Record<Doc['status'], React.ElementType> = {
  draft: FileText,
  saved: Save,
  sent: SendHorizontal,
  viewed: Eye,
  in_progress: Clock,
  signed: PenTool,
  approved: ThumbsUp,
  completed: CheckCircle,
  rejected: XCircle,
  delivery_failed: AlertTriangle,
  expired: Clock,
  cancelled: Ban,
  pending: Clock,
};

export default function DocumentList({searchQuery}: DocumentListProps) {
  const {  documents, setDocuments } = useContextStore();
  // 🔑 States for filters & view
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
 
  const router = useRouter();
  const filteredDocuments = useFilteredDocs(documents, selectedStatus, searchQuery);
  async function handleDeleteDoc(doc: Doc) {
    try {
      const res = await fetch(`/api/documents/delete?id=${encodeURIComponent(doc.documentId || doc.id)}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete document');
  
      // Remove locally
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      localStorage.removeItem('currentDocumentId'); // remove stored doc id 
      toast.success('Document deleted');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Cannot delete: ${err.message}`);
      } else {
        toast.error("Cannot delete: Unknown error");
      }
    }
  }

  async function handleDownloadSignedCopy(doc: Doc) {
    try {
      setDownloadingDoc(doc.id);
      const token = localStorage.getItem('AccessToken') || '';
      
      const res = await fetch(`/api/documents/download-signed?documentId=${encodeURIComponent(doc.documentId || doc.id)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to download signed document');
      }

      // Download the PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}-signed.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Signed document downloaded successfully');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to download signed document');
      }
    } finally {
      setDownloadingDoc(null);
    }
  }

  async function handleResetStatus(doc: Doc) {
    try {
      const res = await fetch(`/api/documents/${doc.id}/reset`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reset document status');
      }

      const { document: updatedDoc } = await res.json();

      // Update the document in the local state
      setDocuments(prev => prev.map(d => {
        if (d.id === updatedDoc._id) {
          return {
            ...d,
            ...updatedDoc,
            id: updatedDoc._id,
            createdAt: new Date(updatedDoc.createdAt),
            updatedAt: new Date(updatedDoc.updatedAt),
          };
        }
        return d;
      }));

      toast.success('Document status has been reset.');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Cannot reset: ${err.message}`);
      } else {
        toast.error('Cannot reset: Unknown error');
      }
    }
  }
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]); // deselect all
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  const handleBulkDeleteComplete = (deletedIds: string[]) => {
    setDocuments(prev => prev.filter(d => !deletedIds.includes(d.id)));
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  return ( 
    <>
             
      <Filters
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        selectedOwner={selectedOwner}
        setSelectedOwner={setSelectedOwner}
        sortBy={sortBy}
        setSortBy={setSortBy}
        toggleSelectAll={toggleSelectAll} 
        selectedIds={selectedIds} 
        totalDocuments={documents.length}
        bulkDelete={setIsBulkDeleteModalOpen}
        />
  <div className="space-y-2 mt-2">
      {filteredDocuments.map((doc) => {
        const statusObj=statuses.find(item => item?.value == doc.status)
        const StatusIcon = statusIcons[doc.status];
        const statusColor = statusObj?.color;
        const docFileUrl = doc.fileUrl || doc.url;
        return (
          <div
            key={doc.id}
            className="flex items-center px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
            <div className="flex flex-1 items-center gap-3">
                <input
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                className="h-4 w-4 accent-blue-600"
              />
              <PdfThumbnail fileUrl={docFileUrl} width={40} height={50} />
              <div className="font-medium text-gray-900"  onClick={() => {
                  if (docFileUrl && doc.documentId) {
                    localStorage.setItem('currentDocumentId', doc.documentId);
                    // clear any previous session id so a new session will start when editor opens
                    localStorage.removeItem('currentSessionId');
                    router.push(`/builder/${doc.documentId}`);
                  } else {
                    toast('No file found for this document.');
                  }
                }}>
                  {doc.name}
                  <small className="flex text-gray-500">
                    Created {doc.createdAt && new Date(doc.createdAt).toLocaleDateString()}
                  </small>           
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {doc.status === 'rejected' && (
                <button
                  className="text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetStatus(doc);
                  }}
                  title="Reset Status"
                  data-testid={`reset-status-${doc.id}`}
                >
                  <RefreshCw size={26} />
                </button>
              )}
              <button
                className="text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation(); 
                  handleDeleteDoc(doc);
                }}
                data-testid={`delete-doc-${doc.id}`}
                >
                <Trash2 size={26} />
              </button>
                {/* View/Download Original */}
                {docFileUrl && (
                  <a
                    href={docFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={e => e.stopPropagation()}
                    title='View / Download'
                    data-testid={`view-doc-${doc.id}`}
                  >
                   <View size={26}/> 
                  </a>
                )}
                
                {/* Download Signed Copy Button */}
                {doc.status === 'completed' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSignedCopy(doc);
                    }}
                    disabled={downloadingDoc === doc.id}
                    className="text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    title="Download Signed Copy"
                    data-testid={`download-signed-${doc.id}`}
                  >
                    {downloadingDoc === doc.id ? (
                      <div className="animate-spin">
                        <FileCheck size={26} />
                      </div>
                    ) : (
                      <FileCheck size={26} />
                    )}
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="text-gray-300 cursor-not-allowed"
                      data-testid={`download-signed-disabled-${doc.id}`}
                    >
                      <FileCheck size={26} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                      Signed copy will be available once all recipients complete signing.
                    </div>
                  </div>
                )}

              {StatusIcon &&  <StatusIcon size={26} className={`ml-2 ${statusColor}`} /> }             
              <span className={`capitalize ${statusColor}`}>
                {doc.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
    <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedDocs={documents.filter(doc => selectedIds.includes(doc.id))}
        onDeleteComplete={handleBulkDeleteComplete}
      />
  </>
  );
}