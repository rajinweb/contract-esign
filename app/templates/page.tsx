'use client';

import { TemplatesPage as TemplatesPageComponent } from "@/components/templates/TemplatesPage";
import { useTemplates } from "@/hooks/useTemplates";
import { Suspense } from 'react';

export default function TemplatesPage() {
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
        <Suspense fallback={<div>Loading templates...</div>}>
            <TemplatesPageComponent
                templates={templates}
                loading={loading}
                error={error}
                fetchTemplates={fetchTemplates}
                duplicateTemplate={duplicateTemplate}
                deleteTemplate={deleteTemplate}
                createDocumentFromTemplate={createDocumentFromTemplate}
            />
        </Suspense>
    );
}