import { DroppedComponent, Recipient, UploadResult } from "@/types/types";

const getFieldTypeFromComponentLabel = (label: string): string => {
    const mapping: { [key: string]: string } = {
        'signature': 'signature',
        'image': 'image',
        'text': 'text',
        'date': 'date',
        'initials': 'initials',
        'full name': 'text',
        'email': 'text',
        'checkbox': 'checkbox',
        'stamp': 'stamp',
        'realtime photo': 'realtime_photo',
    };
    const lowerCaseLabel = label ? label.toLowerCase() : '';
    return mapping[lowerCaseLabel] || 'text';
};

export const uploadToServer = async (
    blob: Blob | null,
    documentName: string,
    currentPage: number,
    droppedComponents: DroppedComponent[],
    recipients: Recipient[],
    documentId: string | null,
    setDocumentId: (id: string) => void,
    setDocumentName: (name: string) => void,
    setSelectedFile: (name: string) => void,
    sessionId?: string | null,
    signingToken?: string,
    isMetadataOnly: boolean = true
): Promise<UploadResult | null> => {

    const formData = new FormData();
    const safeFileName = (documentName || 'document').replace(/[<>:"/\\|?*]+/g, '').trim();
    const finalFileName = safeFileName.endsWith('.pdf') ? safeFileName : `${safeFileName}.pdf`;

    // Only append file if it's a new version (not metadata-only update)
    if (blob && !isMetadataOnly || !documentId) {
        formData.append('file', blob as Blob, finalFileName);
    }

    formData.append('documentName', finalFileName);
    formData.append('isMetadataOnly', isMetadataOnly.toString());

    if (sessionId) {
        formData.append('sessionId', sessionId);
    }

    // Enhanced field mapping to ensure all field data is preserved
    formData.append('fields', JSON.stringify(droppedComponents.map(comp => {
        return {
            id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
            type: getFieldTypeFromComponentLabel(comp.component),
            x: comp.x,
            y: comp.y,
            width: comp.width,
            height: comp.height,
            pageNumber: comp.pageNumber || currentPage,
            recipientId: comp.assignedRecipientId,
            required: comp.required !== false,
            value: comp.data || '',
            placeholder: comp.placeholder,
            mimeType: comp.mimeType,
        };
    })));

    formData.append('recipients', JSON.stringify(recipients));
    // ensure we include a documentId if available either from the caller or localStorage
    const docIdToSend = documentId || (typeof window !== 'undefined' ? localStorage.getItem('currentDocumentId') : null);
    if (docIdToSend) {
        formData.append('documentId', docIdToSend);
    }

    const changeLog = isMetadataOnly
        ? 'Field metadata updated'
        : documentId
            ? 'New version created with file changes'
            : 'Initial document creation';
    formData.append('changeLog', changeLog);

    const headers: Record<string, string> = {};
    if (signingToken) {
        headers['X-Signing-Token'] = signingToken;
    } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    if (typeof window !== 'undefined') {
        headers['X-Recipient-Id'] = new URLSearchParams(window.location.search).get("recipient") || '';
    }
    const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: Object.keys(headers).length ? headers : undefined,
        body: formData,
        credentials: 'include', // if you use cookies/session
    });

    if (!response.ok) {
        throw new Error('Failed to save PDF to server');
    }
    const result = await response.json();
    console.log('Server response:', result);

    if (result.documentId) {
        setDocumentId(result.documentId);
        localStorage.setItem('currentDocumentId', result.documentId);
    }

    if (result.sessionId) {
        localStorage.setItem('currentSessionId', result.sessionId);
    }

    if (result.documentName) {
        setDocumentName(result.documentName);
    } else if (result.fileUrl) {
        const u = new URL(result.fileUrl, window.location.origin);
        const p = u.searchParams.get('path');
        if (p) {
            const decoded = decodeURIComponent(p);
            const parts = decoded.split('/');
            setDocumentName(parts[parts.length - 1]);
        }
    }

    if (result.fileUrl && !signingToken) setSelectedFile(result.fileUrl);
    return result;
};
