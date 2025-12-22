'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplates, Template } from '@/hooks/useTemplates'; // Import useTemplates and Template type

export default function TemplatesPage() {
    const router = useRouter();
    const { templates, loading, fetchTemplates, duplicateTemplate } = useTemplates(); // Use templates from hook

    useEffect(() => {
        fetchTemplates(); // fetchTemplates updates templates internally via setTemplates
    }, [fetchTemplates]);

    const handleUseTemplate = async (templateId: string) => {
        try {
            const res = await fetch('/api/templates/use', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ templateId }),
            });

            if (res.ok) {
                const { documentId, sessionId } = await res.json();
                router.push(`/builder/${documentId}?guestId=${sessionId}`);
            } else {
                console.error('Failed to use template');
            }
        } catch (error) {
            console.error('Error using template:', error);
        }
    };
    
    const handleDeleteTemplate = async (templateId: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            try {
                const token = localStorage.getItem('AccessToken') || '';
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const res = await fetch(`/api/templates/${templateId}`, {
                    method: 'DELETE',
                    headers,
                });

                if (res.ok) {
                    // Refetch templates after deletion (fetchTemplates updates templates internally)
                    await fetchTemplates();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    console.error('Failed to delete template:', errorData.message || 'Unknown error');
                }
            } catch (error) {
                console.error('Error deleting template:', error);
            }
        }
    };

    const handleDuplicateAndEdit = useCallback(async (templateId: string) => {
        try {
            const duplicated = await duplicateTemplate(templateId);
            if (duplicated && duplicated._id) {
                // Navigate to a builder page for editing the duplicated template
                // Assuming a template builder route like /builder/template/:templateId
                router.push(`/builder/template/${duplicated._id}`);
            } else {
                console.error('Failed to duplicate template or get its ID.');
            }
        } catch (error) {
            console.error('Error duplicating and editing template:', error);
        }
    }, [duplicateTemplate, router]);
    
    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Templates</h1>
                <button
                    onClick={() => router.push('/templates/create')}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                    Create New Template
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <div key={template._id} className="border rounded-lg p-4">
                        <h2 className="text-lg font-semibold">{template.name}</h2> {/* Use template.name */}
                        <p>Category: {template.category}</p>
                        <p>Used {template.duplicateCount || 0} times</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={() => handleUseTemplate(template._id)}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Use Template
                            </button>
                            {template.isSystemTemplate && ( // Only show duplicate for system templates
                                <button
                                    onClick={() => handleDuplicateAndEdit(template._id)}
                                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Duplicate & Edit
                                </button>
                            )}
                            {!template.isSystemTemplate && ( // Show delete only for non-system (user) templates
                                <button
                                    onClick={() => handleDeleteTemplate(template._id)}
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}