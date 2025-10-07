'use client';
import React, {useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Save,
  View,
} from 'lucide-react';
import { Doc, statuses} from '@/types/types';
import PdfThumbnail from '@/components/PdfThumbnails';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import toast from 'react-hot-toast';
import Filters from './dashboard/Filters';
import { useFilteredDocs } from '@/hooks/useFilteredDocs';
interface DocumentListProps {
    searchQuery: string;
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
  saved:Save
}

export default function DocumentList({searchQuery}: DocumentListProps) {
  const { setSelectedFile, documents, setDocuments } = useContextStore();
  // 🔑 States for filters & view
  
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const router = useRouter();
  const filteredDocuments = useFilteredDocs(documents, selectedStatus, searchQuery);
  async function handleDeleteDoc(doc: Doc) {
    try {
      const res = await fetch(`/api/documents/delete?documentId=${encodeURIComponent(doc.id)}&name=${encodeURIComponent(doc.name)}`, {
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
        view={view}
        setView={setView} 
        toggleSelectAll={toggleSelectAll} 
        selectedIds={selectedIds} 
        totalDocuments={documents.length}      
        />
  <div className="space-y-4">
      {filteredDocuments.map((doc) => {
        const statusObj=statuses.find(item => item?.value == doc.status)
        const StatusIcon = statusIcons[doc.status];
        const statusColor = statusObj?.color;
        return (
          <div
            key={doc.id}
            className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
            <div className="flex flex-1 items-center gap-3">
                <input
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                className="h-4 w-4 accent-blue-600"
              />
              <PdfThumbnail fileUrl={doc.url} width={60} height={70} />
              <div className="font-medium text-gray-900"  onClick={() => {
                  if (doc.url && doc.documentId) {
                    setSelectedFile(doc.url);
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
                    Created {doc.createdAt.toLocaleDateString()}
                  </small>           
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <button
                className="text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation(); 
                  handleDeleteDoc(doc);
                }}
                >
                <Trash2 size={26} />
              </button>
                {/* Add this below */}
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                    onClick={e => e.stopPropagation()}
                    title='View / Download'
                  >
                   <View size={26}/> 
                  </a>
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
  </>
  );
}
