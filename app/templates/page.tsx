'use client';
import { TemplatesPage } from '@/components/templates/TemplatesPage';
import { Suspense } from 'react';
import { useTemplates } from '@/hooks/useTemplates';

export default function TemplatesPageWrapper() {
  const {
    templates,
    loading,
    error,
    fetchTemplates,
    duplicateTemplate,
    deleteTemplate,
    createDocumentFromTemplate,
  } = useTemplates();
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-gray-500">Loading templates...</div>}>
      <TemplatesPage templates={templates} loading={loading} error={error} fetchTemplates={fetchTemplates} duplicateTemplate={duplicateTemplate} deleteTemplate={deleteTemplate} createDocumentFromTemplate={createDocumentFromTemplate} />
    </Suspense>
  );
}
