'use client';

import TemplateSearch from "@/components/templates/TemplateSearch";
import { Templates  } from "@/components/templates/Templates";
import { useTemplates } from "@/hooks/useTemplates";
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';

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
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    return (
        <Suspense fallback={<div>Loading templates...</div>}>
            <>
              {usePathname() =='/templates' && 
              <div className="m-auto container max-w-7xl p-8 mt-14">
              <h1 className="text-xl font-bold">Templates</h1>
              <p className="text-gray-600 my-2">Manage, and organize your document templates</p>
              <TemplateSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                className="!w-full"
              /> 
            </div>
            }
            <Templates
                templates={templates}
                loading={loading}
                error={error}
                fetchTemplates={fetchTemplates}
                duplicateTemplate={duplicateTemplate}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                deleteTemplate={deleteTemplate}
                createDocumentFromTemplate={createDocumentFromTemplate}
            />
          </>
        </Suspense>
    );
}