import { DroppedComponent, Recipient, UploadResult } from "@/types/types";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { blobToURL } from "./Utils";
import dayjs from "dayjs";
import {saveFileToIndexedDB } from "./indexDB";

// --- Utility functions ---
export async function loadPdf(selectedFile: File | string) {
    const arrayBuffer = typeof selectedFile === 'string'
        ? await fetch(selectedFile).then(res => res.arrayBuffer())
        : await selectedFile.arrayBuffer();

    return PDFDocument.load(arrayBuffer);
}

export function sanitizeFileName(fileName: string): string {
    const safe = fileName.replace(/[<>:"/\\|?*]+/g, '').trim();
    return safe.endsWith('.pdf') ? safe : `${safe}.pdf`;
}

export function createBlobUrl(blob: Blob): Promise<string> {
    return blobToURL(blob);
}

// --- Merge fields into PDF ---
export async function mergeFieldsIntoPdf(
    pdfDoc: PDFDocument,
    droppedComponents: DroppedComponent[],
    pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>,
    canvasRect: DOMRect,
    currentPage: number,
    options: { autoDate?: boolean }
) {
    const pages = pdfDoc.getPages();
    const page = pages[currentPage - 1];
    const pageWidth = page.getSize().width;
    const pageHeight = page.getSize().height;
    const isPageRotated = page.getRotation().angle;

    for (const item of droppedComponents) {
        const { x, y, component, width, height, data, pageNumber } = item;
        const pageIndex = (pageNumber ?? currentPage) - 1;
        const pageEl = pageRefs.current[pageIndex];
        if (!pageEl) continue;

        const pageRect = pageEl.getBoundingClientRect();
        const scaleX = pageWidth / pageRect.width;
        const scaleY = pageHeight / pageRect.height;

        const relativeX = x - (pageRect.left - canvasRect.left);
        const relativeY = y - (pageRect.top - canvasRect.top);

        let adjustedX = relativeX * scaleX;
        let adjustedY = pageHeight - (relativeY + height) * scaleY;

        const scaledW = width * scaleX;
        const scaledH = height * scaleY;

        // Boundary checks
        adjustedX = Math.max(0, Math.min(adjustedX, pageWidth - scaledW));
        adjustedY = Math.max(0, Math.min(adjustedY, pageHeight - scaledH));

        if (data) {
            if (component === "Text" || component === "Date") {
                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = 12;
                const lineHeight = fontSize * 1.2;
                const maxWidth = width * scaleX;
                const textLines: string[] = [];

                data.split('\n').forEach((paragraph) => {
                    let line = '';
                    paragraph.split(' ').forEach((word) => {
                        const testLine = line ? line + ' ' + word : word;
                        const lineWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
                        if (lineWidth > maxWidth) {
                            textLines.push(line);
                            line = word;
                        } else {
                            line = testLine;
                        }
                    });
                    if (line) textLines.push(line);
                });

                let cursorY = adjustedY + height * scaleY - lineHeight;
                textLines.forEach((line) => {
                    if (cursorY < adjustedY) return;
                    page.drawText(line, { x: adjustedX, y: cursorY, size: fontSize, font: helveticaFont });
                    cursorY -= lineHeight;
                });
            } else if (component === "Signature" || component === "Image" || component === "Realtime Photo") {
                try {
                    const res = await fetch(data as string);
                    const imgBytes = await res.arrayBuffer();
                    const bytes = new Uint8Array(imgBytes);
                    let embeddedImage;

                    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
                        embeddedImage = await pdfDoc.embedPng(imgBytes);
                    } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
                        embeddedImage = await pdfDoc.embedJpg(imgBytes);
                    } else continue;

                    page.drawImage(embeddedImage, {
                        x: adjustedX,
                        y: adjustedY,
                        width: scaledW,
                        height: scaledH,
                        ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {}),
                    });
                } catch {
                    continue;
                }
            }
        }

        if (options.autoDate) {
            page.drawText(`Signed ${dayjs().format("M/d/YYYY HH:mm:ss ZZ")}`, {
                x: adjustedX,
                y: adjustedY - 20 * Math.min(scaleX, scaleY),
                size: 10,
                color: rgb(0.074, 0.545, 0.262),
                ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {})
            });
        }
    }

    return pdfDoc;
}

// --- Save and Upload ---
export async function savePdfBlob(pdfDoc: PDFDocument): Promise<Blob> {
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}

export const uploadToServer = async (
    blob: Blob | null,
    fileName: string,
    currentPage: number,
    droppedComponents: DroppedComponent[],
    recipients: Recipient[],
    documentId: string | null,
    setDocumentId: (id: string) => void,
    setFileName: (name: string) => void,
    setSelectedFile: (name: string) => void,
    sessionId?: string | null,
    isMetadataOnly: boolean = true
): Promise<UploadResult | null> => {

    const formData = new FormData();
    const safeFileName = (fileName || 'document').replace(/[<>:"/\\|?*]+/g, '').trim();
    const finalFileName = safeFileName.endsWith('.pdf') ? safeFileName : `${safeFileName}.pdf`;

    // Only append file if it's a new version (not metadata-only update)
    if (blob && !isMetadataOnly) {
        formData.append('file', blob, finalFileName);
    }

    formData.append('documentName', fileName);
    formData.append('fileName', finalFileName);
    formData.append('isMetadataOnly', isMetadataOnly.toString());

    if (sessionId) {
        formData.append('sessionId', sessionId);
    }
    
    // Enhanced field mapping to ensure all field data is preserved
    formData.append('fields', JSON.stringify(droppedComponents.map(comp => ({
        id: comp.id?.toString() || `field_${Math.random().toString(36).substr(2, 9)}`,
        type: comp.component.toLowerCase().replace(' ', '_'),
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
    }))));
    
    formData.append('recipients', JSON.stringify(recipients));
    if (documentId) {
        formData.append('documentId', documentId);
    }

    const changeLog = isMetadataOnly
        ? 'Field metadata updated'
        : documentId
            ? 'New version created with file changes'
            : 'Initial document creation';
    formData.append('changeLog', changeLog);

    const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

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

    saveFileToIndexedDB(result.fileUrl);

    if (result.documentId) {
        setDocumentId(result.documentId);
        localStorage.setItem('currentDocumentId', result.documentId);
    }

    if (result.sessionId) {
        localStorage.setItem('currentSessionId', result.sessionId);
    }

    if (result.fileName) {
        setFileName(result.fileName);
    } else if (result.fileUrl) {
        const u = new URL(result.fileUrl, window.location.origin);
        const p = u.searchParams.get('path');
        if (p) {
            const decoded = decodeURIComponent(p);
            const parts = decoded.split('/');
            setFileName(parts[parts.length - 1]);
        }
    }

    if (result.fileUrl) setSelectedFile(result.fileUrl);
    return result;
};

export function downloadPdf(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

