'use client';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useContextStore from './useContextStore';

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
    fields?: unknown[];
    defaultSigners?: unknown[];
    tags?: string[];
    createdAt: Date;
    duplicateCount?: number;
    deletedAt?: Date;
    // Optional documentId used when creating a template from an existing document
    documentId?: string | null;
    isActive?: boolean;
}

export interface CreateDocumentFromTemplateResult {
    documentId: string;
    sessionId: string;
    guestId?: string | null;
}

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setTrashedTemplatesCount, isLoggedIn } = useContextStore();

    const persistGuestSessionId = useCallback((guestId: unknown): string | null => {
        if (typeof guestId === 'string' && guestId.startsWith('guest_')) {
            localStorage.setItem('guest_session_id', guestId);
            return guestId;
        }
        return null;
    }, []);

    const resolveGuestSessionId = useCallback((): string => {
        const existing = persistGuestSessionId(localStorage.getItem('guest_session_id'));
        if (existing) return existing;
        const next = `guest_${uuidv4()}`;
        persistGuestSessionId(next);
        return next;
    }, [persistGuestSessionId]);
    const fetchTemplates = useCallback(async (category?: string, search?: string, isActive?: boolean) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (search) params.append('search', search);
            // Only send isActive if explicitly set
            if (typeof isActive === 'boolean') {
                params.append('isActive', String(isActive));
            }
            const url = `/api/templates/list?${params}`;
            console.log('Fetching from:', url);

            const response = await fetch(url, {
                credentials: 'include',
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
            const headers: Record<string, string> = {
                'Accept': 'application/json',
            };
            const response = await fetch(`/api/templates/${templateId}?format=json`, {
                headers,
                credentials: 'include',
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
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const response = await fetch('/api/templates/create', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(templateData),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch {
                    throw new Error('Failed to create template and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to create template');
            }
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

    const duplicateTemplate = useCallback(async (templateId: string) => {
        setLoading(true);
        setError(null);
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const response = await fetch('/api/templates/duplicate', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ templateId }),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch {
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
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE',
                credentials: 'include',
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

    const fetchTrashedTemplatesCount = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Call the list endpoint with returnCount=true and isActive=false
            const response = await fetch('/api/templates/list?isActive=false&returnCount=true', {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to fetch trashed templates count');
            const data = await response.json();
            setTrashedTemplatesCount(data.totalCount); // Use totalCount from the list endpoint
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching trashed templates count:', err);
        } finally {
            setLoading(false);
        }
    }, [setTrashedTemplatesCount]);

    const trashTemplate = useCallback(async (templateId: string): Promise<Template | null> => {
        setLoading(true);
        setError(null);
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const response = await fetch('/api/templates/trash', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ templateIds: [templateId] }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to trash template';
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const errorPayload = await response.json();
                        errorMessage = errorPayload?.message || errorMessage;
                    }
                } catch {
                    throw new Error('Failed to move template in trash.');
                }

                throw new Error(errorMessage);
            }
            const data = await response.json();
            fetchTrashedTemplatesCount();

            return data.template ?? null;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            console.error('Error trashing template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [fetchTrashedTemplatesCount]); // Added fetchTrashedTemplatesCount to dependencies

    const restoreTemplate = useCallback(async (templateId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const response = await fetch(`/api/templates/restore`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ templateIds: [templateId] }),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch {
                    throw new Error('Failed to restore template and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to restore template');
            }
            fetchTrashedTemplatesCount(); // Refresh the count
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error restoring template:', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, [fetchTrashedTemplatesCount]); // Added fetchTrashedTemplatesCount to dependencies

    const createDocumentFromTemplate = useCallback(async (templateId: string, documentName?: string): Promise<CreateDocumentFromTemplateResult | null> => {
        setLoading(true);
        setError(null);
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Keep one canonical guest session id only for anonymous template usage.
            const guestId = isLoggedIn ? null : resolveGuestSessionId();

            const response = await fetch('/api/templates/use', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    templateId,
                    documentName,
                    ...(guestId ? { guestId } : {}),
                }),
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch {
                    // If JSON parsing fails, the response might not be JSON.
                    // We'll throw a generic error, but in a real app, you might want to handle this differently.
                    throw new Error('Failed to create document and could not parse error response.');
                }
                throw new Error(errorPayload.message || 'Failed to create document from template');
            }
            const data: CreateDocumentFromTemplateResult = await response.json();
            localStorage.setItem('currentDocumentId', data.documentId);
            localStorage.setItem('currentSessionId', data.sessionId);
            persistGuestSessionId(data.guestId);

            return data;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'An error occurred';
            setError(errMsg);
            console.error('Error using template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, persistGuestSessionId, resolveGuestSessionId]);

    const uploadTemplate = useCallback(async (file: File, templateData: Partial<Template>) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();

            formData.append('file', file);
            formData.append('name', templateData.name || '');
            formData.append('description', templateData.description || '');
            formData.append('category', templateData.category || '');
            if (templateData.tags && Array.isArray(templateData.tags)) {
                formData.append('tags', templateData.tags.join(', '));
            }

            const response = await fetch('/api/templates/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch {
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
        duplicateTemplate,
        deleteTemplate,
        createDocumentFromTemplate,
        uploadTemplate,
        trashTemplate,
        restoreTemplate,
        fetchTrashedTemplatesCount,
    };
}
