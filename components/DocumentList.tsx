'use client';
import React, { useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Save,
  SendHorizontal,
  PenTool,
  Ban,
  ThumbsUp,
  Eye,
  Trash,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Doc, statuses } from '@/types/types';
import PdfThumbnail from '@/components/PdfThumbnails';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import toast from 'react-hot-toast';
import Filters from './dashboard/Filters';
import { useFilteredDocs } from '@/hooks/useFilteredDocs';
import DeleteModal from './documents/DeleteModal';
import { Button } from './Button';
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
  trashed: Trash,
  expired: Clock,
  cancelled: Ban,
  voided: Ban,
  pending: Clock,
};

export default function DocumentList({ searchQuery }: DocumentListProps) {
  const { documents, setDocuments } = useContextStore();
  /* -------------------- UI State -------------------- */
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  /* -------------------- Selection -------------------- */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const router = useRouter();
  const filteredDocuments = useFilteredDocs(documents.filter(doc => !doc.deletedAt), selectedStatus, searchQuery);
  /* -------------------- Download -------------------- */

  async function handleDownloadSignedCopy(doc: Doc) {
    try {
      setDownloadingDoc(doc.id);
      const res = await fetch(`/api/documents/download-signed?documentId=${encodeURIComponent(doc.documentId || doc.id)}`, {
        method: 'GET',
        credentials: 'include',
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

  /* -------------------- Selection helpers -------------------- */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    //const selectableDocs = documents.filter(d => d.status !== 'trashed');
    const selectableIds = filteredDocuments.map(d => d.id);

    const allSelected =
      selectableIds.length > 0 &&
      selectableIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // deselect only selectable docs
      setSelectedIds(prev =>
        prev.filter(id => !selectableIds.includes(id))
      );
    } else {
      // select all non-trashed docs
      setSelectedIds(selectableIds);
    }
  };

  const handleDeleteDoc = (trashedIds: string[]) => {
    const deletedAt = new Date();
    setDocuments(prev =>
      prev.map(doc =>
        trashedIds.includes(doc.id)
          ? {
              ...doc,
              deletedAt,
              statusBeforeDelete: doc.statusBeforeDelete || doc.status,
            }
          : doc
      )
    );
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
    localStorage.removeItem('currentDocumentId');
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
        bulkDelete={() => setIsDeleteModalOpen(true)}
      />
      <div className="space-y-2 mt-2">
        {filteredDocuments.map((doc) => {
          const statusObj = statuses.find(item => item?.value == doc.status)
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
                <div className="font-medium text-gray-900" onClick={() => {
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
               { doc.status == 'rejected' && <Button
                  className="!rounded-full relative group"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleResetStatus(doc);
                  }}
                  disabled={downloadingDoc === doc.id}
                  title="Reset Status"
                  data-testid={`reset-status-${doc.id}`}
                  icon={<RefreshCw size={16} />}
                  inverted
                >
                   <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    The document signing request was rejected by a recipient. Reset the document status to continue signing.                    
                    </div>
                </Button>
                }
                <Button
                  className="text-red-500 hover:text-red-700 !rounded-full relative"
                  onClick={(e) => {
                    e?.stopPropagation();
                    setIsDeleteModalOpen(true);
                    setSelectedIds([doc.id]);
                  }}
                  inverted
                  data-testid={`delete-doc-${doc.id}`}
                  icon={<Trash2 size={16} />}
                  title="Delete"
                />

                <Button inverted
                  className={`!rounded-full`}
                  title='View / Download'
                  icon={<Eye size={16} />}
                  disabled={!docFileUrl}
                  onClick={(e) => {
                    e?.stopPropagation();
                    window.open(docFileUrl, '_Blank')
                  }}
                />

                <Button
                  onClick={(e) => {
                    if (doc.status !== 'completed') {
                      return false
                    }
                    e?.stopPropagation();
                    handleDownloadSignedCopy(doc);
                  }}
                  inverted
                  disabled={downloadingDoc === doc.id || doc.status !== 'completed'}
                  className={`!rounded-full relative group`}
                  title="Download Signed Copy"
                  data-testid={`download-signed-${doc.id}`}
                  icon={<Download size={16} className={`${downloadingDoc === doc.id ? 'animate-bounce' : ''}`} />}
                >
                  {doc.status !== 'completed' &&
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                      Signed copy will be available once all recipients complete signing.
                    </div>
                  }
                </Button>

                {StatusIcon && <StatusIcon size={22} className={`ml-2 ${statusColor}`} />}
                <span className={`capitalize ${statusColor}`}>
                  {doc.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        selectedDocs={documents.filter(doc => selectedIds.includes(doc.id))}
        onDeleteComplete={handleDeleteDoc}
      />
    </>
  );
}
