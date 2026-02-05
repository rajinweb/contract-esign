import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentRecipient } from '@/models/Document';
import SignatureModel from '@/models/Signature';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getUserIdFromReq } from '@/lib/auth';
import { DocumentField } from '@/types/types';
import dayjs from 'dayjs';
import { getObjectStream } from '@/lib/s3';
import { Readable } from 'stream';

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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
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
        if (document.deletedAt) {
            return NextResponse.json({ error: 'Document has been trashed.' }, { status: 410 });
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

        // Get the current version by number (do not rely on array index ordering)
        const versionByNumber = document.versions.find((v: any) => v.version === document.currentVersion);
        const signedVersions = (document.versions || []).filter(
            (v: any) => typeof v?.label === 'string' && v.label.startsWith('signed') && typeof v.version === 'number'
        );
        signedVersions.sort((a: any, b: any) => (b.version ?? 0) - (a.version ?? 0));
        const latestSignedVersion = signedVersions[0];
        const version = versionByNumber || latestSignedVersion || (document.versions || [])[document.versions.length - 1];
        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        // Convert Buffer to Uint8Array for pdf-lib
        let pdfBuffer: Buffer | null = null;

        if (version.pdfData) {
            if (Buffer.isBuffer(version.pdfData)) {
                pdfBuffer = version.pdfData;
            } else if ((version.pdfData as any).buffer) {
                // Handle if it's a mongoose Buffer object
                pdfBuffer = Buffer.from((version.pdfData as any).buffer);
            } else if (typeof version.pdfData === 'object' && (version.pdfData as any).type === 'Buffer' && Array.isArray((version.pdfData as any).data)) {
                // Handle serialized Buffer format
                pdfBuffer = Buffer.from((version.pdfData as any).data);
            } else {
                console.error('Unexpected pdfData type:', typeof version.pdfData);
                return NextResponse.json({ error: 'Invalid PDF data format' }, { status: 500 });
            }
        } else if (version.storage?.provider === 's3' && version.storage.bucket && version.storage.key) {
            const stream = await getObjectStream({
                bucket: version.storage.bucket,
                key: version.storage.key,
                region: version.storage.region
            });
            pdfBuffer = await streamToBuffer(stream);
        }

        if (!pdfBuffer) {
            return NextResponse.json({ error: 'PDF data not available' }, { status: 404 });
        }

        // Load the original PDF
        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Overlay field values onto the PDF (if present)
        const preparedVersions = (document.versions || []).filter((v: any) => v?.label === 'prepared');
        preparedVersions.sort((a: any, b: any) => (b?.version || 0) - (a?.version || 0));
        const preparedVersion = preparedVersions[0];
        const rawFields = Array.isArray(preparedVersion?.fields)
            ? (preparedVersion.fields as DocumentField[])
            : Array.isArray(version.fields)
                ? (version.fields as DocumentField[])
                : [];

        const signedFieldRecords = await SignatureModel.find({ documentId: document._id }).lean();
        const fieldValueMap = new Map<string, { value: string; version: number; signedAt: number }>();
        for (const record of signedFieldRecords) {
            const fieldId = String((record as any).fieldId ?? '');
            if (!fieldId) continue;
            const signedVersion = typeof (record as any).version === 'number' ? (record as any).version : -1;
            const signedAt = (record as any).signedAt ? new Date((record as any).signedAt).getTime() : 0;
            const existing = fieldValueMap.get(fieldId);
            if (!existing || signedVersion > existing.version || (signedVersion === existing.version && signedAt > existing.signedAt)) {
                fieldValueMap.set(fieldId, {
                    value: String((record as any).fieldValue ?? ''),
                    version: signedVersion,
                    signedAt,
                });
            }
        }

        const fields = rawFields.map((field) => {
            const plain = typeof (field as any)?.toObject === 'function' ? (field as any).toObject() : { ...field };
            const fieldId = String((plain as any)?.id ?? (plain as any)?.fieldId ?? '');
            if (!fieldId) return plain as DocumentField;
            const signedValue = fieldValueMap.get(fieldId);
            if (!signedValue) return plain as DocumentField;
            return { ...(plain as DocumentField), value: signedValue.value };
        });

        for (const field of fields) {

            if (!field.pageNumber || !field) continue;

            const page = pages[field.pageNumber - 1];
            const { width: pageWidth, height: pageHeight } = page.getSize();

            const rotation = page.getRotation().angle;

            let scaleX = 1;
            let scaleY = 1;
            let relativeX = field.x;
            let relativeY = field.y;
            if (field.pageRect?.width && field.pageRect?.height) {
                scaleX = pageWidth / field.pageRect.width;
                scaleY = pageHeight / field.pageRect.height;
                if (typeof field.pageRect.left === 'number' && typeof field.pageRect.top === 'number') {
                    const candidateX = field.x - field.pageRect.left;
                    const candidateY = field.y - field.pageRect.top;
                    const withinX = candidateX >= -1 && candidateX <= field.pageRect.width + 1;
                    const withinY = candidateY >= -1 && candidateY <= field.pageRect.height + 1;
                    if (withinX && withinY) {
                        relativeX = candidateX;
                        relativeY = candidateY;
                    }
                }
            }

            const adjustedX = relativeX * scaleX;
            const adjustedY =
                pageHeight - (relativeY + field.height) * scaleY;

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
                ['signature', 'initials', 'image', 'stamp', 'live_photo'].includes(
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
        const fieldTypeCounts = rawFields.reduce((acc: Record<DocumentField['type'], number>, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const fieldSummary = Object.entries(fieldTypeCounts)
            .map(([type, count]) => `${count} ${type}${count as number > 1 ? 's' : ''}`)
            .join(', ') || 'N/A';

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
