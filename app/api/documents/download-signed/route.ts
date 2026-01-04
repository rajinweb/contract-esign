import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentRecipient } from '@/models/Document';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getUserIdFromReq } from '@/lib/auth';
import { DocumentField } from '@/types/types';
import dayjs from 'dayjs';

export const runtime = 'nodejs';
function wrapText(
    text: string,
    font: any,
    fontSize: number,
    maxWidth: number
): string[] {
    const lines: string[] = [];

    text.split('\n').forEach((paragraph) => {
        let line = '';
        paragraph.split(' ').forEach((word) => {
            const testLine = line ? `${line} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth) {
                if (line) lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        });
        if (line) lines.push(line);
    });

    return lines;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const documentId = req.nextUrl.searchParams.get('documentId');
        if (!documentId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        // Get userId for authorization
        const userId = await getUserIdFromReq(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch document (without .lean() to preserve Buffer type)
        const document = await DocumentModel.findById(documentId);
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Verify ownership
        if (String(document.userId) !== String(userId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Verify document is signed or completed
        if (document.status !== 'signed' && document.status !== 'completed') {
            return NextResponse.json({
                error: 'Document is not completed yet',
                message: 'Signed copy will be available once all recipients complete signing.'
            }, { status: 400 });
        }

        // Get the current version
        const version = document.versions[document.currentVersion - 1];
        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        if (!version.pdfData) {
            return NextResponse.json({ error: 'PDF data not available' }, { status: 404 });
        }

        // Convert Buffer to Uint8Array for pdf-lib
        let pdfBuffer: Buffer;

        if (Buffer.isBuffer(version.pdfData)) {
            pdfBuffer = version.pdfData;
        } else if (version.pdfData.buffer) {
            // Handle if it's a mongoose Buffer object
            pdfBuffer = Buffer.from(version.pdfData.buffer);
        } else if (typeof version.pdfData === 'object' && version.pdfData.type === 'Buffer' && Array.isArray(version.pdfData.data)) {
            // Handle serialized Buffer format
            pdfBuffer = Buffer.from(version.pdfData.data);
        } else {
            console.error('Unexpected pdfData type:', typeof version.pdfData);
            return NextResponse.json({ error: 'Invalid PDF data format' }, { status: 500 });
        }

        // Load the original PDF
        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Overlay field values onto the PDF        
        for (const field of version.fields as DocumentField[]) {

            if (!field.pageNumber || !field) continue;

            const page = pages[field.pageNumber - 1];
            const { width: pageWidth, height: pageHeight } = page.getSize();

            const rotation = page.getRotation().angle;

            let scaleX = 1;
            let scaleY = 1;
            if (field.pageRect) {
                scaleX = pageWidth / field.pageRect.width;
                scaleY = pageHeight / (field.pageRect.height + field.pageRect.y + field.height);
            }

            const adjustedX = field.x * scaleX;
            const adjustedY =
                pageHeight - (field.y + field.height) * scaleY;

            const scaledW = field.width * scaleX;
            const scaledH = field.height * scaleY;

            // Clamp to page
            const x = Math.max(0, Math.min(adjustedX, pageWidth - scaledW));
            const y = Math.max(0, Math.min(adjustedY, pageHeight - scaledH));

            /* ---------------- TEXT ---------------- */
            if (field.type === 'text' || field.type === 'date') {
                if (!field.value) continue;

                const fontSize = Math.min(12 * scaleY, scaledH * 0.8);
                const lineHeight = fontSize * 1.2;
                const lines = wrapText(
                    String(field.value),
                    font,
                    fontSize,
                    scaledW
                );

                let cursorY = y + scaledH - lineHeight;

                for (const line of lines) {
                    if (cursorY < y) break;
                    page.drawText(line, {
                        x,
                        y: cursorY,
                        size: fontSize,
                        font,
                        ...(rotation ? { rotate: degrees(rotation) } : {}),
                    });
                    cursorY -= lineHeight;
                }
            }

            /* ---------------- IMAGE ---------------- */
            if (
                ['signature', 'initials', 'image', 'stamp', 'realtime_photo'].includes(
                    field.type
                )
            ) {
                if (!field.value?.startsWith('data:image')) continue;

                const base64 = field.value.split(',')[1];
                const bytes = Buffer.from(base64, 'base64');

                let image;
                try {
                    image = field.value.includes('png')
                        ? await pdfDoc.embedPng(bytes)
                        : await pdfDoc.embedJpg(bytes);
                } catch {
                    continue;
                }

                page.drawImage(image, {
                    x,
                    y,
                    width: scaledW,
                    height: scaledH,
                    ...(rotation ? { rotate: degrees(rotation) } : {}),
                });
            }

            /* ---------------- CHECKBOX ---------------- */
            if (field.type === 'checkbox' && field.value === 'true') {
                const size = Math.min(scaledW, scaledH) * 0.8;
                page.drawText('X', {
                    x: x + scaledW / 4,
                    y: y + scaledH / 6,
                    size,
                    font: boldFont,
                    color: rgb(0, 0.5, 0),
                });
            }

            page.drawText(`Signed ${dayjs().format("M/d/YYYY HH:mm:ss ZZ")}`, {
                x: adjustedX,
                y: adjustedY - 20 * Math.min(scaleX, scaleY),
                size: 10,
                color: rgb(0.074, 0.545, 0.262),
                ...(rotation ? { rotate: degrees(rotation) } : {})
            });

        }


        console.log(`Completed processing all fields for document ${documentId}`);

        // Create metadata/audit trail page
        const metadataPage = pdfDoc.addPage();
        const { height } = metadataPage.getSize();
        let yPosition = height - 50;

        // Title
        metadataPage.drawText('Certificate of Completion', {
            x: 50,
            y: yPosition,
            size: 20,
            font: boldFont,
            color: rgb(0, 0.2, 0.5),
        });
        yPosition -= 40;

        // Document details
        metadataPage.drawText(`Document: ${document.documentName}`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
        });
        yPosition -= 20;

        metadataPage.drawText(`Status: Signed`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
            color: rgb(0, 0.5, 0),
        });
        yPosition -= 20;

        metadataPage.drawText(`Completed: ${new Date().toLocaleString()}`, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
        });
        yPosition -= 20;

        // Field summary
        const fieldTypeCounts = (version.fields as DocumentField[]).reduce((acc: Record<DocumentField['type'], number>, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const fieldSummary = Object.entries(fieldTypeCounts)
            .map(([type, count]) => `${count} ${type}${count as number > 1 ? 's' : ''}`)
            .join(', ');

        metadataPage.drawText(`Fields: ${fieldSummary}`, {
            x: 50,
            y: yPosition,
            size: 10,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
        });
        yPosition -= 40;

        // Audit Trail
        metadataPage.drawText('Audit Trail', {
            x: 50,
            y: yPosition,
            size: 16,
            font: boldFont,
        });
        yPosition -= 30;

        // List all recipients and their signing details
        const recipients = document.recipients as IDocumentRecipient[] || [];
        for (const recipient of recipients) {
            if (yPosition < 100) {
                // If we're running out of space, you might want to add another page
                // For now, we'll just stop
                break;
            }

            metadataPage.drawText('_'.repeat(80), {
                x: 50,
                y: yPosition,
                size: 10,
                font: font,
                color: rgb(0.7, 0.7, 0.7),
            });
            yPosition -= 20;

            metadataPage.drawText(`Name: ${recipient.name}`, {
                x: 50,
                y: yPosition,
                size: 11,
                font: boldFont,
            });
            yPosition -= 18;

            metadataPage.drawText(`Email: ${recipient.email}`, {
                x: 50,
                y: yPosition,
                size: 10,
                font: font,
            });
            yPosition -= 18;

            metadataPage.drawText(`Role: ${recipient.role}`, {
                x: 50,
                y: yPosition,
                size: 10,
                font: font,
            });
            yPosition -= 18;

            metadataPage.drawText(`Status: ${recipient.status}`, {
                x: 50,
                y: yPosition,
                size: 10,
                font: font,
                color: recipient.status === 'signed' ? rgb(0, 0.5, 0) : rgb(0.5, 0.5, 0.5),
            });
            yPosition -= 18;

            if (recipient.signedAt) {
                metadataPage.drawText(`Signed At: ${new Date(recipient.signedAt).toLocaleString()}`, {
                    x: 50,
                    y: yPosition,
                    size: 10,
                    font: font,
                });
                yPosition -= 18;
            }

            if (recipient.ipAddress) {
                metadataPage.drawText(`IP Address: ${recipient.ipAddress}`, {
                    x: 50,
                    y: yPosition,
                    size: 10,
                    font: font,
                    color: rgb(0.5, 0.5, 0.5),
                });
                yPosition -= 18;
            }

            yPosition -= 10; // Extra space between recipients
        }

        // Add footer
        metadataPage.drawText('This document has been electronically signed and is legally binding.', {
            x: 50,
            y: 30,
            size: 8,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
        });

        // Save the merged PDF
        const pdfBytes = await pdfDoc.save();

        // Return as downloadable file
        return new Response(new Uint8Array(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${document.documentName}-signed.pdf"`,
                'Content-Length': pdfBytes.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error generating signed document:', error);
        return NextResponse.json({
            error: 'Failed to generate signed document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
