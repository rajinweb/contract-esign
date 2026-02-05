import { DocumentField, DroppedComponent, Recipient, UploadResult, DocumentFieldType } from "@/types/types";

/* =====================================================
   FIELD TYPE MAPPING
===================================================== */
export const getFieldTypeFromComponentLabel = (label: string): string => {
    const mapping: Record<string, string> = {
        signature: "signature",
        image: "image",
        text: "text",
        date: "date",
        initials: "initials",
        "full name": "text",
        email: "text",
        checkbox: "checkbox",
        stamp: "stamp",
        "live photo": "live_photo"
    };

    return mapping[label?.toLowerCase()] ?? "text";
};

/* =====================================================
   MAIN UPLOAD HANDLER
===================================================== */
const serializePageRect = (pageRect: any) => {
  if (!pageRect || typeof pageRect !== "object") return undefined;
  const rect = pageRect as Record<string, any>;
  const cleaned = {
    x: typeof rect.x === "number" ? rect.x : undefined,
    y: typeof rect.y === "number" ? rect.y : undefined,
    width: typeof rect.width === "number" ? rect.width : undefined,
    height: typeof rect.height === "number" ? rect.height : undefined,
    top: typeof rect.top === "number" ? rect.top : undefined,
    right: typeof rect.right === "number" ? rect.right : undefined,
    bottom: typeof rect.bottom === "number" ? rect.bottom : undefined,
    left: typeof rect.left === "number" ? rect.left : undefined,
  };
  const hasAny = Object.values(cleaned).some((value) => typeof value === "number");
  return hasAny ? cleaned : undefined;
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

    /* =====================================================
       🔐 SIGNING MODE (RECIPIENT)
       NO FILE UPLOAD
       NO METADATA
    ===================================================== */
    if (signingToken) {
        const signingFields: DocumentField[] = droppedComponents.map(comp => ({
            id: comp.fieldId ?? comp.id?.toString() ?? crypto.randomUUID(),
            type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType,
            x: comp.x,
            y: comp.y,
            width: comp.width,
            height: comp.height,
            pageNumber: comp.pageNumber || currentPage,
            recipientId: comp.assignedRecipientId,
            required: comp.required !== false,
            value: comp.data || "",
            placeholder: comp.placeholder,
            mimeType: comp.mimeType,
            pageRect: serializePageRect(comp.pageRect),
            fieldOwner: comp.fieldOwner,
            isPrivate: comp.isPrivate
        }));
        const response = await fetch("/api/sign-document", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: signingToken,
                fields: signingFields
            })
        });

        if (!response.ok) {
            throw new Error(`Signing failed (${response.status})`);
        }

        return await response.json();
    }

    /* =====================================================
       ✏️ EDITOR MODE (OWNER)
    ===================================================== */

    const formData = new FormData();

    const safeFileName = (documentName || "document")
        .replace(/[<>:"/\\|?*]+/g, "")
        .trim();

    const finalFileName = safeFileName.endsWith(".pdf")
        ? safeFileName
        : `${safeFileName}.pdf`;

    // Upload file only if creating or replacing a version
    if ((blob && !isMetadataOnly) || !documentId) {
        formData.append("file", blob as Blob, finalFileName);
    }

    formData.append("documentName", finalFileName);
    formData.append("isMetadataOnly", isMetadataOnly.toString());

    if (sessionId) {
        formData.append("sessionId", sessionId);
    }

    /* ===============================
       AUTH HEADERS
    =============================== */
    const headers: Record<string, string> = {};
    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("AccessToken")
            : null;

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    /* ===============================
       LOAD SERVER STATE
    =============================== */
    const loadResponse = await fetch(
        `/api/documents/load?id=${documentId}`,
        {
            headers,
            cache: "no-store"
        }
    );

    if (!loadResponse.ok) {
        throw new Error(`Failed to load document (${loadResponse.status})`);
    }

    const loadData = await loadResponse.json();
    const serverFields: DocumentField[] = loadData.document?.fields ?? [];
    const serverRecipients: Recipient[] = loadData.document?.recipients ?? [];

    /* ===============================
       MAP CLIENT FIELDS
    =============================== */
    const clientFields: DocumentField[] = droppedComponents.map(comp => ({
        id: comp.fieldId ?? comp.id?.toString() ?? crypto.randomUUID(),
        type: getFieldTypeFromComponentLabel(comp.component) as DocumentFieldType,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        pageNumber: comp.pageNumber || currentPage,
        recipientId: comp.assignedRecipientId,
        required: comp.required !== false,
        value: comp.data || "",
        placeholder: comp.placeholder,
        mimeType: comp.mimeType,
        pageRect: serializePageRect(comp.pageRect),
        fieldOwner: comp.fieldOwner,
        isPrivate: comp.isPrivate
    }));

    /* ===============================
       MERGE FIELDS (EDITOR MODE)
    =============================== */
    const mergedFields: DocumentField[] = [];
    const indexById = new Map<string, number>();
    const normalizeId = (field: DocumentField) => String(field?.id ?? '');

    const upsertField = (field: DocumentField) => {
        const id = normalizeId(field);
        if (!id) return;
        const existingIndex = indexById.get(id);
        if (existingIndex === undefined) {
            indexById.set(id, mergedFields.length);
            mergedFields.push(field);
        } else {
            mergedFields[existingIndex] = field;
        }
    };

    clientFields.forEach(upsertField);
    serverFields.forEach((field) => {
        const id = normalizeId(field);
        if (!indexById.has(id)) {
            upsertField(field);
        }
    });

    /* ===============================
       MERGE RECIPIENTS
    =============================== */
    const mergedRecipients = serverRecipients.map(sr => {
        const cr = recipients.find(r => r.id === sr.id);
        return cr ? { ...sr, ...cr } : sr;
    });

    recipients.forEach(r => {
        if (!mergedRecipients.some(m => m.id === r.id)) {
            mergedRecipients.push(r);
        }
    });

    /* ===============================
       FORM DATA
    =============================== */
    formData.append("fields", JSON.stringify(mergedFields));
    formData.append("recipients", JSON.stringify(mergedRecipients));

    if (documentId) {
        formData.append("documentId", documentId);
    }

    formData.append(
        "changeLog",
        isMetadataOnly
            ? "Field metadata updated"
            : documentId
                ? "New version created"
                : "Initial document creation"
    );

    /* ===============================
       SAVE
    =============================== */
    const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
    }

    const result = await response.json();

    if (result.documentId) {
        setDocumentId(result.documentId);
        localStorage.setItem("currentDocumentId", result.documentId);
    }

    if (result.documentName) {
        setDocumentName(result.documentName);
    }

    if (result.fileUrl) {
        setSelectedFile(result.fileUrl);
    }

    return result;
};
