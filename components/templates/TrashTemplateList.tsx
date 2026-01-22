'use client';
import { useState, useEffect } from 'react';
import {
  Trash2,
  History,
} from 'lucide-react';
import { Template, useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/Button';
import RestoreTemplateModal from './RestoreModal';
import PdfThumbnail from '../PdfThumbnails';
import DeleteModal from './DeleteModal';

interface TrashTemplateListProps {
  searchQuery: string;
}

export default function TrashTemplateList({ searchQuery }: TrashTemplateListProps) {
  const { templates, loading, error, fetchTemplates, deleteTemplate, fetchTrashedTemplatesCount, restoreTemplate } = useTemplates();
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreOpen, setRestoreOpen] = useState(false);
  
  useEffect(() => {
    fetchTemplates(undefined, searchQuery, false);
    fetchTrashedTemplatesCount(); // Fetch initial count
  }, [fetchTemplates, searchQuery, fetchTrashedTemplatesCount]);

  const toggleSelect = (template: Template) => {
    setSelectedTemplates(prev =>
      prev.some(t => t._id === template._id) ? prev.filter(t => t._id !== template._id) : [...prev, template]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates);
    }
  };

  const onRestoreCompleted = async () => {
    // Restore each selected template
    const promises = selectedTemplates.map(t => restoreTemplate(t._id));
    await Promise.all(promises);

    fetchTemplates(undefined, searchQuery, false);
    setSelectedTemplates([]);
    fetchTrashedTemplatesCount(); // Refresh count after restore
  };

  const handleDelete = async (templatesToDelete: Template[]) => {
    const promises = templatesToDelete.map(t => deleteTemplate(t._id));
    await Promise.all(promises);
    fetchTemplates(undefined, searchQuery, false);
    setSelectedTemplates([]);
    fetchTrashedTemplatesCount(); // Refresh count after delete
  };  

  const filteredTemplates = templates.filter(template => !template.isActive);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return filteredTemplates.length === 0 ? (
    <div className="text-center py-12 text-gray-400 X-translate-y-1/2 top-1/2 relative">
      <Trash2 size={38} className='m-auto ' />
      <h3 className="text-lg font-semibold  mb-2">Trash is empty.</h3>
      <p className="text-gray-600 mb-6">
        Deleted templates will appear here.
      </p>
    </div>
  ) : (
    <>
      <DeleteCTA
        toggleSelectAll={toggleSelectAll}
        setRestoreOpen={setRestoreOpen}
        setDeleteOpen={setIsDeleteModalOpen}
        selectedTemplates={selectedTemplates}
        totalTemplates={filteredTemplates.length}
      />
      <div className="space-y-2 mt-2">
        {filteredTemplates.map((template) => {
          const docFileUrl = template.templateFileUrl || template.thumbnailUrl;
          return (
          <div
            key={template._id}
            className="flex items-center px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex flex-1 items-center gap-3">
              <input
                type="checkbox"
                checked={selectedTemplates.some(t => t._id === template._id)}
                onChange={() => toggleSelect(template)}
                className="h-4 w-4 accent-blue-600"
              />
               {docFileUrl && <PdfThumbnail fileUrl={docFileUrl} width={40} height={50} />}
              <div className="font-medium text-gray-900">
                {template.name}
                <small className="flex text-gray-500">
                  Created on {template.createdAt && new Date(template.createdAt).toLocaleDateString()} - 
                  Deleted on {template.deletedAt && new Date(template.deletedAt).toLocaleDateString()}
                </small>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Button
                className="!rounded-full"
                onClick={(e) => {
                  e?.stopPropagation();
                  setRestoreOpen(true);
                  setSelectedTemplates([template]);
                }}
                title='Restore'
                icon={<History size={16} />}
                inverted
              />
              <Button
                className="text-red-500 hover:text-red-700 !rounded-full relative"
                onClick={(e) => {
                  e?.stopPropagation();
                  setIsDeleteModalOpen(true);
                  setSelectedTemplates([template]);
                  //handleDelete([template]);
                }}
                inverted
                icon={<Trash2 size={16} />}
                title='Delete'
              />
            </div>
          </div>
        )})}
      </div>
      {selectedTemplates.length > 0 &&
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          selectedDocs={selectedTemplates}
          onConfirmDelete={()=> handleDelete(selectedTemplates)}
          permanent={true}
        />
      }
      <RestoreTemplateModal
        isOpen={isRestoreOpen}
        onClose={() => setRestoreOpen(false)}
        selectedTemplates={selectedTemplates}
        onRestoreComplete={() => onRestoreCompleted()}
      />
    </>
  );
}

/* =============================== DELETE CTA ================================ */
type DeleteCTAProps = {
  toggleSelectAll: () => void;
  selectedTemplates: Template[];
  totalTemplates: number;
  setRestoreOpen: (e: boolean) => void
  setDeleteOpen: (e: boolean) => void
};

function DeleteCTA({
  toggleSelectAll,
  selectedTemplates,
  totalTemplates,
  setRestoreOpen,
  setDeleteOpen,
}: DeleteCTAProps) {
  const isAllSelected = totalTemplates > 0 && selectedTemplates.length === totalTemplates;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 h-14 relative">
      <input
        type="checkbox"
        className="w-4 h-4 border-gray-300 rounded"
        aria-label="Select all"
        checked={isAllSelected}
        onChange={toggleSelectAll}
      />
      <span className="font-medium">{selectedTemplates.length ? `${selectedTemplates.length} selected` : 'Select all'}</span>
      {selectedTemplates.length > 0 && (
        <>
          <Button inverted onClick={() => setRestoreOpen(true)} icon={<History size={16} />} label='Restore' />
          <Button
            inverted
            className="!bg-red-500 text-white"
            onClick={() => setDeleteOpen(true)}
            icon={<Trash2 size={16} />}
            label="Delete Permanently"
          />
        </>
      )}
    </div>
  );
}
