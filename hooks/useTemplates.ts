'use client';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Template {
    _id: string;
    name: string;
    description?: string;
    category: string;
    isSystemTemplate: boolean;
    templateFileUrl: string;
    thumbnailUrl?: string;
    filePath: string;
    fileSize?: number;
    pageCount?: number;
    fields?: any[];
    defaultSigners?: any[];
    tags?: string[];
    createdAt: Date;
    duplicateCount?: number;
    // Optional documentId used when creating a template from an existing document
    documentId?: string | null;
}

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async (category?: string, search?: string) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (category) params.append('category', category);
                if (search) params.append('search', search);

                const token = localStorage.getItem('AccessToken') || '';
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const url = `/api/templates/list?${params}`;
                console.log('Fetching from:', url, 'with token:', token ? (token.substring(0, 20) + '...') : 'none');

                const response = await fetch(url, {
                    headers,
                });

                console.log('Response status:', response.status);
                if (!response.ok) throw new Error('Failed to fetch templates');
                const data = await response.json();
                console.log('Received templates:', data.templates?.length, 'templates');
                setTemplates(data.templates || []);
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : 'An error occurred';
                console.error('Error fetching templates:', errMsg);
                setError(errMsg);
            } finally {
                setLoading(false);
            }
        }, []);

    const getTemplate = useCallback(async (templateId: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {
                'Accept': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`/api/templates/${templateId}?format=json`, {
                headers,
            });

            if (!response.ok) throw new Error('Failed to fetch template');
            const data = await response.json();
            return data.template;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createTemplate = useCallback(async (templateData: Partial<Template>) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch('/api/templates/create', {
                method: 'POST',
                headers,
                body: JSON.stringify(templateData),
            });

            if (!response.ok) throw new Error('Failed to create template');
            const data = await response.json();
            return data.template;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error creating template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateTemplate = useCallback(async (templateId: string, updates: Partial<Template>) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates),
            });

            if (!response.ok) throw new Error('Failed to update template');
            const data = await response.json();
            return data.template;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error updating template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const duplicateTemplate = useCallback(async (templateId: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch('/api/templates/duplicate', {
                method: 'POST',
                headers,
                body: JSON.stringify({ templateId }),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch (e) {
                    throw new Error('Failed to duplicate template and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to duplicate template');
            }
            
            const data = await response.json();
            return data.template;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errMsg);
            console.error('Error duplicating template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteTemplate = useCallback(async (templateId: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) throw new Error('Failed to delete template');
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error deleting template:', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const createDocumentFromTemplate = useCallback(async (templateId: string, documentName?: string): Promise<{ documentId: string; sessionId: string } | null> => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Only add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Get guest ID if user is not logged in
            let guestId: string | null = null;
            if (!token) {
                guestId = localStorage.getItem('guest_session_id');
                if (!guestId) {
                    guestId = `guest_${uuidv4()}`;
                    localStorage.setItem('guest_session_id', guestId);
                }
            }

            const response = await fetch('/api/templates/use', {
                method: 'POST',
                headers,
                body: JSON.stringify({ templateId, documentName, guestId }),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch (e) {
                    // If JSON parsing fails, the response might not be JSON.
                    // We'll throw a generic error, but in a real app, you might want to handle this differently.
                    throw new Error('Failed to create document and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to create document from template');
            }
            const data: { documentId: string, sessionId: string } = await response.json();
            
            return data;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errMsg);
            console.error('Error using template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadTemplate = useCallback(async (file: File, templateData: Partial<Template>) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('AccessToken') || '';
            const formData = new FormData();

            formData.append('file', file);
            formData.append('name', templateData.name || '');
            formData.append('description', templateData.description || '');
            formData.append('category', templateData.category || '');
            if (templateData.tags && Array.isArray(templateData.tags)) {
                formData.append('tags', templateData.tags.join(', '));
            }

            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/templates/upload', {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch (e) {
                    throw new Error('Failed to upload template and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to upload template');
            }

            const data = await response.json();
            return data.template;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errMsg);
            console.error('Error uploading template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        templates,
        loading,
        error,
        fetchTemplates,
        getTemplate,
        createTemplate,
        updateTemplate,
        duplicateTemplate,
        deleteTemplate,
        createDocumentFromTemplate,
        uploadTemplate,
    };
}
