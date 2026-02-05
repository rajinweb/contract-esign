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
  History,
} from 'lucide-react';
import { Doc, statuses } from '@/types/types';
import PdfThumbnail from '@/components/PdfThumbnails';
import useContextStore from '@/hooks/useContextStore';
import { useFilteredDocs } from '@/hooks/useFilteredDocs';
import DeleteModal from '@/components/documents/DeleteModal';
import BulkRestoreModal from './RestoreModal';
import { Button } from '@/components/Button';
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

export default function TrashDocumentList({ searchQuery }: DocumentListProps) {
  const { documents, setDocuments } = useContextStore();
  /* ----------------------------- UI / Selection ----------------------------- */
  const [selectedIds, setSelectedIds] = useState<Doc[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreOpen, setRestoreOpen] = useState(false);

  /* --------------------------- Filtered Trash Docs -------------------------- */

  const trashedDocs = documents.filter(d => d.deletedAt);
  const filteredDocuments = useFilteredDocs(
    trashedDocs,
    null,
    searchQuery
  );
  const selectableDocuments = filteredDocuments.filter(doc => doc.status !== 'completed');

  /* ----------------------------- Select Helpers ----------------------------- */
  const toggleSelect = (id: string) => {
    const doc = trashedDocs.find(d => d.id === id);
    if (!doc || doc.status === 'completed') return;
    setSelectedIds(prev =>
      prev.some(doc => doc.id === id) ? prev.filter(doc => doc.id !== id) : [...prev, trashedDocs.find(d => d.id === id)!]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === selectableDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableDocuments);
    }
  };

  /* --------------------------- Shared UI Mutations -------------------------- */

  const removeDocsFromUI = (ids: string[]) => {
    setDocuments(prev => prev.filter(d => !ids.includes(d.id))); // Assuming d.id is a string
    setSelectedIds([]);
  };

  const handleDelete = () => {
    removeDocsFromUI(selectedIds.map(d => d.id))
  };

  const hasCompletedSelected = selectedIds.some((doc) => doc.status === 'completed');

  const resolveRestoreStatus = (doc: Doc): Doc['status'] => {
    const candidate = doc.statusBeforeDelete;
    if (candidate && statuses.some((s) => s.value === candidate)) {
      return candidate as Doc['status'];
    }
    return doc.status;
  };

  const handleRestore = (restoredIds: string[]) => {
    setDocuments(prev =>
      prev.map(doc =>
        restoredIds.includes(doc.id)
          ? {
              ...doc,
              deletedAt: null,
              status: resolveRestoreStatus(doc),
              statusBeforeDelete: undefined,
            }
          : doc
      )
    );
    setSelectedIds([]);
  };

  /* --------------------------------- Render -------------------------------- */
  return trashedDocs.length === 0 ? (
    <div className="text-center py-12 text-gray-400 top-1/2 relative">
      <Trash2 size={38} className='m-auto ' />
      <h3 className="text-lg font-semibold  mb-2">Trash is empty.</h3>
      <p className="text-gray-600 mb-6">
        Deleted documents will appear here.
      </p>
    </div>
  ) : (
    <>
      <DeleteCTA
        toggleSelectAll={toggleSelectAll}
        setRestoreOpen={setRestoreOpen}
        setDeleteOpen={setIsDeleteModalOpen}
        selectedIds={selectedIds}
        totalDocuments={selectableDocuments.length}
        hasCompletedSelected={hasCompletedSelected}
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
                  checked={selectedIds.some(selectedDoc => selectedDoc.id === doc.id)}
                  onChange={() => toggleSelect(doc.id)}
                  disabled={doc.status === 'completed'}
                  aria-disabled={doc.status === 'completed'}
                  title={doc.status === 'completed' ? 'Completed documents cannot be bulk-selected' : undefined}
                  className="h-4 w-4 accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <PdfThumbnail fileUrl={docFileUrl} width={40} height={50} />
                <div className="font-medium text-gray-900">
                  {doc.name}
                  <small className="flex text-gray-500">
                    Created {doc.createdAt && new Date(doc.createdAt).toLocaleDateString()} - {' '}
                    Deleted {doc.deletedAt && new Date(doc.deletedAt).toLocaleDateString()}
                  </small>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Button
                  className="!rounded-full"
                  onClick={(e) => {
                    e?.stopPropagation();
                    setSelectedIds([trashedDocs.find(d => d.id === doc.id)!]);
                    setRestoreOpen(true)
                  }}
                  title='Resoter'
                  icon={<History size={16} />}
                  inverted
                />
                <Button
                  className="text-red-500 hover:text-red-700 !rounded-full relative"
                  onClick={(e) => {
                    e?.stopPropagation();
                    if (doc.status === 'completed') {
                      return;
                    }
                    setIsDeleteModalOpen(true);
                    setSelectedIds([trashedDocs.find(d => d.id === doc.id)!]);
                  }}
                  inverted
                  disabled={doc.status === 'completed'}
                  data-testid={`delete-doc-${doc.id}`}
                  icon={<Trash2 size={16} />}
                  title={doc.status === 'completed' ? 'Completed documents cannot be permanently deleted' : 'Delete'}
                />

                {StatusIcon && <StatusIcon size={22} className={`ml-2 ${statusColor}`} />}
                <span className={`capitalize ${statusColor}`}>
                  {doc.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedIds.length > 0 &&
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          selectedDocs={selectedIds}
          onDeleteComplete={handleDelete}
          permanent={true}
        />
      }
      <BulkRestoreModal
        isOpen={isRestoreOpen}
        onClose={() => setRestoreOpen(false)}
        selectedDocs={selectedIds}
        onRestoreComplete={(selectedIds: string[]) => handleRestore(selectedIds)}
      />
    </>
  );
}

/* =============================== DELETE CTA ================================ */

type DeleteCTAProps = {
  toggleSelectAll: () => void;
  selectedIds: Doc[];
  totalDocuments: number;
  setRestoreOpen: (e: boolean) => void
  setDeleteOpen: (e: boolean) => void
  hasCompletedSelected: boolean;

};

function DeleteCTA({
  toggleSelectAll,
  selectedIds,
  totalDocuments,
  setRestoreOpen,
  setDeleteOpen,
  hasCompletedSelected,
}: DeleteCTAProps) {
  const isAllSelected =
    totalDocuments > 0 && selectedIds.length === totalDocuments;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 h-14 relative">
      <input
        type="checkbox"
        className="w-4 h-4 border-gray-300 rounded"
        aria-label="Select all"
        checked={isAllSelected}
        onChange={toggleSelectAll}
      />
      <span className="font-medium">{selectedIds.length ? `${selectedIds.length} selected` : 'Select all'}</span>
      {selectedIds.length > 0 && (
        <>
          <Button inverted onClick={() => setRestoreOpen(true)} icon={<History size={16} />} label='Restore' />
          <Button
            inverted
            className="!bg-red-500 text-white"
            onClick={() => {
              if (hasCompletedSelected) return;
              setDeleteOpen(true);
            }}
            icon={<Trash2 size={16} />}
            label="Delete Permanently"
            disabled={hasCompletedSelected}
          />
        </>
      )}
    </div>
  );
}
