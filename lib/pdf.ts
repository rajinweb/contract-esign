import { DroppedComponent, DocumentField } from "@/types/types";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import dayjs from "dayjs";
import { Readable } from "stream";

// --- Utility functions ---
export async function loadPdf(selectedFile: File | string) {
    const arrayBuffer = typeof selectedFile === 'string'
        ? await fetch(selectedFile).then(res => {
            if (!res.ok) {
                throw new Error(`Failed to fetch PDF file. Status: ${res.status}`);
            }
            return res.arrayBuffer();
        })
        : await selectedFile.arrayBuffer();

    return PDFDocument.load(arrayBuffer);
}

export function sanitizeFileName(documentName: string): string {
    const safe = documentName.replace(/[<>:"/\\|?*]+/g, '').trim();
    return safe.endsWith('.pdf') ? safe : `${safe}.pdf`;
}

export function blobToURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      const base64data = reader.result;
      resolve(base64data as string);
    };
  });
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
            } else if (component === "Signature" || component === "Image" || component === "Live Photo") {
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
                        ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {})
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

export function downloadPdf(blob: Blob, documentName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = documentName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// --- SERVER-SIDE PDF FIELD MERGING ---
/**
 * Server-side PDF field merging for signing operations.
 * Loads a PDF from a stream, merges field values into it, and returns the merged PDF as a buffer.
 *
 * @param pdfStream - Stream containing the PDF binary
 * @param fields - Array of field objects with their values and positions
 * @returns Promise<Buffer> - The merged PDF as a buffer
 */
export async function mergeFieldsIntoPdfServer(
    pdfStream: Readable,
    fields: DocumentField[]
): Promise<Buffer> {
    // Read the PDF stream into a buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
        pdfStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfStream.on('end', resolve);
        pdfStream.on('error', reject);
    });
    const pdfBytes = Buffer.concat(chunks);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Process each field
    for (const field of fields) {
        if (!field.pageNumber || field.pageNumber < 1 || field.pageNumber > pages.length) {
            continue; // Skip invalid page numbers
        }

        const pageIndex = field.pageNumber - 1;
        const page = pages[pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Text and Date fields
        if (['text', 'date'].includes(field.type) && field.value) {
            try {
                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = Math.min(field.height || 12, 14);
                page.drawText(field.value, {
                    x: field.x,
                    y: pageHeight - field.y - field.height,
                    size: fontSize,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
            } catch (err) {
                console.error(`Failed to draw text field ${field.id}:`, err);
            }
        }

        // Signature, initials, stamp, image fields
        if (['signature', 'initials', 'stamp', 'image', 'live_photo'].includes(field.type) && field.value) {
            try {
                // field.value is expected to be a base64 data URL or image URL
                let imageBytes: Buffer;

                if (typeof field.value === 'string') {
                    if (field.value.startsWith('data:')) {
                        // Data URL format
                        const base64Data = field.value.split(',')[1];
                        imageBytes = Buffer.from(base64Data, 'base64');
                    } else if (field.value.startsWith('http')) {
                        // HTTP URL - fetch it
                        const response = await fetch(field.value);
                        imageBytes = Buffer.from(await response.arrayBuffer());
                    } else {
                        continue;
                    }

                    // Detect image type and embed
                    let embeddedImage;
                    if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
                        // PNG
                        embeddedImage = await pdfDoc.embedPng(imageBytes);
                    } else if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) {
                        // JPEG
                        embeddedImage = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        continue; // Unsupported image format
                    }

                    page.drawImage(embeddedImage, {
                        x: field.x,
                        y: pageHeight - field.y - field.height,
                        width: field.width,
                        height: field.height,
                    });
                }
            } catch (err) {
                console.error(`Failed to draw image field ${field.id}:`, err);
            }
        }
    }

    // Save and return the merged PDF as a buffer
    const mergedPdfBytes = await pdfDoc.save();
    return Buffer.from(mergedPdfBytes);
}
