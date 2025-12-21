'use client';

import { useState, useEffect } from 'react';
import { Doc } from '@/types/types';
import { useRouter } from 'next/navigation';

export default function CreateTemplatePage() {
    const [documents, setDocuments] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const res = await fetch('/api/documents/list');
                if (res.ok) {
                    const { documents: data } = await res.json();
                    // Filter out documents that are already templates
                    setDocuments(data.filter((doc: Doc) => !doc.isTemplate));
                } else {
                    console.error('Failed to fetch documents');
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    const handleCreateTemplate = async (documentId: string) => {
        const templateName = prompt('Enter a name for the new template:');
        if (templateName) {
            try {
                const res = await fetch('/api/templates/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ documentId, templateName }),
                });

                if (res.ok) {
                    router.push('/templates');
                } else {
                    console.error('Failed to create template');
                }
            } catch (error) {
                console.error('Error creating template:', error);
            }
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Create Template from Document</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                        <h2 className="text-lg font-semibold">{doc.name}</h2>
                        <button
                            onClick={() => handleCreateTemplate(doc.id)}
                            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Create Template
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
