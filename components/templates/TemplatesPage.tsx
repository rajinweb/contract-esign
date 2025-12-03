'use client';
import PdfThumbnail from '@/components/PdfThumbnails';
import TemplatePreviewModal from '@/components/TemplatePreviewModal';
import useContextStore from '@/hooks/useContextStore';
import type { Template } from '@/hooks/useTemplates';
import { Copy, Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = ['HR', 'Legal', 'Sales', 'Finance', 'Other'];

export function TemplatesPage({
  initialViewMode,
  templates,
  loading,
  error,
  fetchTemplates,
  duplicateTemplate,
  deleteTemplate,
  createDocumentFromTemplate,
  onTemplateDeleted,
}: {
  initialViewMode?: 'all' | 'my' | 'system',
  templates: Template[],
  loading: boolean,
  error: string | null,
  fetchTemplates: (category?: string, search?: string) => Promise<void>,
  duplicateTemplate: (templateId: string) => Promise<Template | null>,
  deleteTemplate: (templateId: string) => Promise<boolean>,
  createDocumentFromTemplate: (templateId: string, documentName?: string) => Promise<{ documentId: string; sessionId: string } | null>,
  onTemplateDeleted?: () => void,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, setShowModal } = useContextStore(); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'system'>(initialViewMode || 'all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    console.log('Fetching templates for category:', selectedCategory, 'search:', searchQuery);
    fetchTemplates(selectedCategory ?? undefined, searchQuery);
  }, [selectedCategory, searchQuery, fetchTemplates]);

  // Honor incoming view query param (e.g. ?view=my) so embedded dashboard can open My Templates
  useEffect(() => {
    const view = searchParams?.get('view');
    if (view === 'my' || view === 'system' || view === 'all') {
      console.log(`Setting filter mode from URL param: ${view}`);
      setFilterMode(view);
    }
  }, [searchParams]);

  const handleFilterChange = (mode: 'all' | 'my' | 'system') => {
    console.log(`Setting filter mode to: ${mode}`);
    setFilterMode(mode);
  };

  const handleDuplicate = async (templateId: string) => {
    if (!isLoggedIn) {
      setShowModal(true);
      return;
    }
    const result = await duplicateTemplate(templateId);
    if (result) {
      toast.success('Template duplicated successfully');
      await fetchTemplates(selectedCategory ?? undefined, searchQuery);
    } else {
      toast.error('Failed to duplicate template');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const result = await deleteTemplate(templateId);
      if (result) {
        toast.success('Template deleted successfully');
        await fetchTemplates(selectedCategory ?? undefined, searchQuery);
        console.log('Calling onTemplateDeleted');
        if (onTemplateDeleted) {
          onTemplateDeleted();
        }
      } else {
        toast.error('Failed to delete template');
      }
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



  const filteredTemplates = templates.filter((template) => {
    if (filterMode === 'my') {
      return !template.isSystemTemplate;
    }
    if (filterMode === 'system') {
      return template.isSystemTemplate;
    }
    return true;
  });

  const myTemplates = templates.filter((t) => !t.isSystemTemplate);
  const systemTemplates = templates.filter((t) => t.isSystemTemplate);

  return (
   <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl  mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mt-10">Templates</h1>
        <p className="text-gray-600">Create, manage, and organize your document templates</p>
  
        <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

        
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Templates ({templates.length})
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setFilterMode('my')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterMode === 'my'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              My Templates ({myTemplates.length})
            </button>
          )}
          <button
            onClick={() => setFilterMode('system')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterMode === 'system'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            System Templates ({systemTemplates.length})
          </button>
        </div>

        {loading && <div className="text-center py-12 text-gray-500">Loading templates...</div>}

        {error && <div className="text-center py-12 text-red-600">{error}</div>}

        {!loading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="aspect-video bg-gray-200 relative">
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
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {template.category}
                    </span>
                    {template.duplicateCount ? (
                      <span className="text-xs text-gray-500">Used {template.duplicateCount} times</span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseTemplate(template._id, template.name)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Use
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template._id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {isLoggedIn && !template.isSystemTemplate && (
                      <>
                        <button
                          onClick={() => router.push(`/templates/${template._id}/edit`)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template._id)}
                          className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
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

    </div>
  );
}
