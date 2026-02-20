'use client';

import TemplateSearch from "@/components/templates/TemplateSearch";
import { Templates  } from "@/components/templates/Templates";
import useContextStore from "@/hooks/useContextStore";
import { useTemplates } from "@/hooks/useTemplates";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

export default function TemplatesPage() {
    const pathname = usePathname();
    const {searchQuery, setSearchQuery, selectedCategory, setSelectedCategory} = useContextStore();
    const {
        templates,
        loading,
        error,
        fetchTemplates,
        duplicateTemplate,
        createDocumentFromTemplate,
        trashTemplate,
    } = useTemplates();

    return (
        <Suspense fallback={<div>Loading templates...</div>}>
            <>
              {pathname === '/templates' && 
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
                trashTemplate={trashTemplate}
                createDocumentFromTemplate={createDocumentFromTemplate}
            />
          </>
        </Suspense>
    );
}
