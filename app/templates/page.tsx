'use client';

import { TemplatesPage as TemplatesPageComponent } from "@/components/templates/TemplatesPage";
import { useTemplates } from "@/hooks/useTemplates";

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
        <TemplatesPageComponent
            templates={templates}
            loading={loading}
            error={error}
            fetchTemplates={fetchTemplates}
            duplicateTemplate={duplicateTemplate}
            deleteTemplate={deleteTemplate}
            createDocumentFromTemplate={createDocumentFromTemplate}
        />
    );
}