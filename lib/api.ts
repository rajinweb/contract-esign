import { DocumentField, DroppedComponent, Recipient, UploadResult, DocumentFieldType } from "@/types/types";

export const getFieldTypeFromComponentLabel = (label: string): string => {
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
        'live photo': 'live_photo',
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

    const loadResponse = await fetch(`/api/documents/load?id=${documentId}${signingToken ? `&token=${signingToken}` : ''}`, {
        headers: Object.keys(headers).length ? headers : undefined,
        cache: 'no-store',
    });

    if (!loadResponse.ok) {
        throw new Error(`Failed to fetch latest document data. Status: ${loadResponse.status}`);
    }

    const loadData = await loadResponse.json();
    const serverFields: DocumentField[] = loadData.document?.fields || [];
    const serverRecipients: Recipient[] = loadData.document?.recipients || [];

    // Map client fields to DocumentField format
    const clientFieldsMapped: DocumentField[] = droppedComponents.map(comp => {
        return {
            id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
            type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType,
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
            pageRect: comp.pageRect,
            fieldOwner: comp.fieldOwner
        };
    });

    // Determine the current recipient ID from the URL or other context (only relevant in signing mode)
    const currentRecipientId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("recipient") || '' : '';

    // Merge: Start with server fields
    let mergedFields: DroppedComponent[] = serverFields.map(serverField => ({
        id: Number(serverField.id), // Convert id to number
        component: (String(serverField.type || '')).charAt(0).toUpperCase() + String(serverField.type || '').slice(1).replace('_', ' '), // Capitalize like DroppedComponent
        x: serverField.x,
        y: serverField.y,
        width: serverField.width,
        height: serverField.height,
        pageNumber: serverField.pageNumber,
        assignedRecipientId: serverField.recipientId,
        required: serverField.required,
        data: serverField.value,
        placeholder: serverField.placeholder,
        pageRect: serverField.pageRect,
        fieldOwner: serverField.fieldOwner
    }));

    clientFieldsMapped.forEach(clientField => {
        const index = mergedFields.findIndex(s => s.id.toString() === clientField.id);
        const droppedComponent: DroppedComponent = {
            id: Number(clientField.id),
            component: (String(clientField.type || '')).charAt(0).toUpperCase() + String(clientField.type || '').slice(1).replace('_', ' '),
            x: clientField.x,
            y: clientField.y,
            width: clientField.width,
            height: clientField.height,
            pageNumber: clientField.pageNumber,
            assignedRecipientId: clientField.recipientId,
            required: clientField.required,
            data: clientField.value,
            placeholder: clientField.placeholder,
            pageRect: clientField.pageRect,
            fieldOwner: clientField.fieldOwner
        };

        if (index !== -1) {
            // Existing field: update only if not in signing mode or assigned to current recipient
            if (!signingToken || clientField.recipientId === currentRecipientId) {
                mergedFields[index] = { ...mergedFields[index], ...droppedComponent };
            }
        } else {
            // New field: add only if not in signing mode or assigned to current recipient
            if (!signingToken || clientField.recipientId === currentRecipientId) {
                mergedFields.push(droppedComponent);
            }
        }
    });

    // Handle deletions: in editor mode, remove fields not present in client
    if (!signingToken) {
        const clientIds = new Set(clientFieldsMapped.map(f => f.id));
        mergedFields = mergedFields.filter(f => clientIds.has(f.id.toString()));
    }

    // Map merged fields back to DocumentField format
    const mergedFieldsMapped: DocumentField[] = mergedFields.map(comp => ({
        id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
        type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        pageNumber: comp.pageNumber || currentPage,
        recipientId: comp.assignedRecipientId,
        required: comp.required ?? true,
        value: comp.data || '',
        placeholder: comp.placeholder,
        mimeType: comp.mimeType,
        pageRect: comp.pageRect,
        fieldOwner: comp.fieldOwner
    }));

    // Merge recipients: start with server recipients, update with client changes
    const mergedRecipients = serverRecipients.map(serverRec => {
        const clientRec = recipients.find(r => r.id === serverRec.id);
        return clientRec ? { ...serverRec, ...clientRec } : serverRec;
    });
    // Add any new recipients from client not in server
    recipients.forEach(clientRec => {
        if (!mergedRecipients.some(r => r.id === clientRec.id)) {
            mergedRecipients.push(clientRec);
        }
    });

    formData.append('fields', JSON.stringify(mergedFieldsMapped));
    formData.append('recipients', JSON.stringify(mergedRecipients));
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

    const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: Object.keys(headers).length ? headers : undefined,
        body: formData,
        credentials: 'include', // cookie-based auth
    });

    if (!response.ok) {
        throw new Error(`Failed to save PDF to server. Status: ${response.status}`);
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
