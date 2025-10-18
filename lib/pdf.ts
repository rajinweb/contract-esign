import { DroppedComponent } from "@/types/types";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

import dayjs from "dayjs";

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
