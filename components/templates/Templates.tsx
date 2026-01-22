'use client';
import PdfThumbnail from '@/components/PdfThumbnails';
import TemplatePreviewModal from '@/components/TemplatePreviewModal';
import CreateTemplateModal from '@/components/CreateTemplateModal';
import useContextStore from '@/hooks/useContextStore';
import type { Template } from '@/hooks/useTemplates';
import { Copy, Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../Button';
import  DeleteModal  from './DeleteModal';

export function Templates({
  initialViewMode,
  templates,
  loading,
  error,
  fetchTemplates,
  duplicateTemplate,
  deleteTemplate,
  trashTemplate,
  createDocumentFromTemplate,
  onTemplateDeleted,
  searchQuery,
  selectedCategory
}: {
  initialViewMode?: 'all' | 'my' | 'system',
  templates: Template[],
  loading: boolean,
  error: string | null,
  fetchTemplates: (category?: string, search?: string) => Promise<void>,
  duplicateTemplate: (templateId: string) => Promise<Template | null>,
  deleteTemplate: (templateId: string) => Promise<boolean>,
  trashTemplate: (templateId: string) => Promise<Template | null>,
  createDocumentFromTemplate: (templateId: string, documentName?: string) => Promise<{ documentId: string; sessionId: string } | null>,
  onTemplateDeleted?: () => void,
  searchQuery: string,
  selectedCategory: string | null
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, setShowModal } = useContextStore();
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'system'>(initialViewMode || 'all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [localTemplates, setLocalTemplates] = useState<Template[]>(templates);
  const [operatingTemplateId, setOperatingTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  useEffect(() => {
    fetchTemplates(selectedCategory ?? undefined, searchQuery);
  }, [selectedCategory, searchQuery, fetchTemplates]);

  // Honor incoming view query param (e.g. ?view=my) so embedded dashboard can open My Templates
  useEffect(() => {
    const view = searchParams?.get('view');
    if (view === 'my' || view === 'system' || view === 'all') {
      setFilterMode(view);
    }
  }, [searchParams]);


  const handleDuplicate = async (templateId: string) => {
    if (!isLoggedIn) {
      setShowModal(true);
      return;
    }

    setOperatingTemplateId(templateId);
    const originalTemplates = localTemplates;
    const templateToDuplicate = localTemplates.find(t => t._id === templateId);

    if (!templateToDuplicate) return;

    // Optimistic UI update: add duplicated template immediately
    const duplicatedTemplate: Template = {
      ...templateToDuplicate,
      _id: `temp_${Date.now()}`,
      name: `${templateToDuplicate.name} (Copy)`,
    };
    setLocalTemplates([...localTemplates, duplicatedTemplate]);

    try {
      const result = await duplicateTemplate(templateId);
      if (result) {
        // Replace temporary template with actual response
        setLocalTemplates(prev => [
          ...prev.filter(t => t._id !== `temp_${Date.now()}`),
          result
        ]);
        toast.success('Template duplicated successfully');
      } else {
        // Rollback on failure
        setLocalTemplates(originalTemplates);
        toast.error('Failed to duplicate template');
      }
    } catch (err) {
      // Rollback on error
      setLocalTemplates(originalTemplates);
      toast.error('Failed to duplicate template');
    } finally {
      setOperatingTemplateId(null);
    }
  };

  const handleDelete = async (template:Template) => {
    let templateId = template._id;

    setOperatingTemplateId(templateId);
    const originalTemplates = localTemplates;

    try {
      const result = await trashTemplate(templateId); // result is now Template | null
      if (result) { // If a template object is returned, it was successfully trashed
        // Update localTemplates to reflect the trashed state of the template
        setLocalTemplates(prev =>
          prev.map(t => (t._id === result._id ? { ...t, ...result } : t))
        );
        toast.success('Template moved to trash successfully');
        if (onTemplateDeleted) {
          onTemplateDeleted();
        }
      } else {
        // Rollback on failure (result is null)
        setLocalTemplates(originalTemplates);
        toast.error('Failed to move template to trash');
      }
    } catch (err) {
      // Rollback on error
      setLocalTemplates(originalTemplates);
      toast.error('Failed to move template to trash');
    } finally {
      setOperatingTemplateId(null);
      setTemplateToDelete(null);
    }
  };

  const handleUseTemplate = async (templateId: string, templateName: string) => {
    const result =  await createDocumentFromTemplate(templateId, `${templateName} - ${new Date().toLocaleDateString()}`);
    if (result) {
      toast.success('Document created from template');
      localStorage.setItem('currentDocumentId', result.documentId);
      localStorage.setItem('currentSessionId', result.sessionId);
      
      const isEmbedded = searchParams?.get('embed') === 'true';
      if (isEmbedded && window.parent !== window) {
        window.parent.location.href = `/builder/${result.documentId}`;
      } else {
        router.push(`/builder/${result.documentId}`);
      }
    } else {
      toast.error('Failed to create document from template');
    }
  };



  const filteredTemplates = localTemplates.filter((template) => {
    if (template.deletedAt || template.isActive === false) {
      return false;
    }
    if (filterMode === 'my') {
      return !template.isSystemTemplate;
    }
    if (filterMode === 'system') {
      return template.isSystemTemplate;
    }
    return true;
  });


  return (
   <div className="p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {filterMode === 'my' && (
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">My Templates</h2>
            {isLoggedIn && (
              <Button
                onClick={() => setShowCreateModal(true)}
               icon={<Plus className="w-4 h-4" />}
               label='Create Template'
              />
            )}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-500">Loading templates...</div>}

        {error && <div className="text-center py-12 text-red-600">{error}</div>}

        {!loading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-gray-200 relative">
                  {template.templateFileUrl ? (
                    <PdfThumbnail fileUrl={template.templateFileUrl} width={400} height={225} className="w-full h-full object-cover" />
                  ) : template.thumbnailUrl ? (
                    <Image
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      quality={100}
                      width={100}
                      height={100}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                        target.parentElement?.querySelector('.fallback-thumb')?.classList.remove('hidden');
                      }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                      <span className="text-sm text-gray-400">{template.pageCount || 1} page(s)</span>
                    </div>
                  )}
                  {template.isSystemTemplate && (
                    <div className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 text-xs rounded">
                      <div className={`fallback-thumb w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 ${template.thumbnailUrl ? 'hidden' : ''}`}>
                        <span className="text-sm text-gray-400">{template.pageCount || 1} page(s)</span>
                      </div>
                      System
                    </div>
                  )}
              

                <div className="p-4 absolute bottom-0 text-gray-900 bg-white/10 backdrop-blur-xl border-t w-full">
                  <h3 className="font-semibold text-lg mb-1 truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm mb-3 line-clamp-2">{template.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs bg-sky-700 text-gray-100 px-2 py-1 rounded">
                      {template.category}
                    </span>
                    {template.duplicateCount ? (
                      <span className="text-xs text-sky-700">Used {template.duplicateCount} times</span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseTemplate(template._id, template.name)}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-500 transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Use
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="px-3 py-2 bg-gray-700 text-gray-100 text-sm rounded hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Preview"
                      disabled={operatingTemplateId !== null}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template._id)}
                      className="px-3 py-2 bg-gray-700 text-gray-100 text-sm rounded hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Duplicate"
                      disabled={operatingTemplateId !== null}
                    >
                      <Copy className={`w-4 h-4 ${operatingTemplateId === template._id ? 'animate-spin' : ''}`} />
                    </button>
                    {isLoggedIn && !template.isSystemTemplate && (
                      <>
                        <button
                          onClick={() => router.push(`/templates/${template._id}/edit`)}
                          className="px-3 py-2 bg-gray-700 text-gray-100 text-sm rounded hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit"
                          disabled={operatingTemplateId !== null}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTemplateToDelete(template)}
                          className="px-3 py-2 bg-red-700 text-red-100 text-sm rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                          disabled={operatingTemplateId !== null}
                        >
                          <Trash2 className={`w-4 h-4 ${operatingTemplateId === template._id ? 'animate-spin' : ''}`} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4 text-6xl">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Create your first template to get started'}
            </p>
        
          </div>
        )}
  
        {previewTemplate && (
          <TemplatePreviewModal
            isOpen={!!previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            templateUrl={previewTemplate.templateFileUrl}
            templateName={previewTemplate.name}
          />
        )}

        {showCreateModal && (
          <CreateTemplateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchTemplates(selectedCategory ?? undefined, searchQuery);
            }}
          />
        )}
      {templateToDelete && (
        <DeleteModal
          isOpen={!!templateToDelete}
          onClose={() => setTemplateToDelete(null)} 
          onConfirmDelete={() => handleDelete(templateToDelete as Template)}
          selectedDocs={[templateToDelete]}
        />
      )} 
    </div>
  );
}
