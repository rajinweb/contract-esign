import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel, { IDocumentVersion, IDocumentRecipient, IDocumentField } from '@/models/Document';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const runtime = 'nodejs';

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

        // Verify document is signed
        if (document.status !== 'signed') {
            return NextResponse.json({
                error: 'Document is not signed yet',
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
        console.log(`Processing ${version.fields.length} fields for document ${documentId}`);

        for (const field of version.fields as IDocumentField[]) {
            // Skip fields without values (except checkbox which can be unchecked)
            if (!field.value && field.type !== 'checkbox') {
                console.log(`Skipping field ${field.id} (${field.type}) - no value`);
                continue;
            }

            // Validate page number
            if (!field.pageNumber || field.pageNumber < 1 || field.pageNumber > pages.length) {
                console.warn(`Skipping field ${field.id} - invalid page number ${field.pageNumber}`);
                continue;
            }

            const page = pages[field.pageNumber - 1];
            const { height: pageHeight } = page.getSize();

            // Convert coordinates (assuming y is from top, PDF uses bottom-up)
            const pdfY = pageHeight - field.y - field.height;

            try {
                // Handle image-based fields: signature, initials, stamp, image, realtime_photo
                if (['signature', 'initials', 'stamp', 'image', 'realtime_photo'].includes(field.type)) {
                    if (!field.value || !field.value.startsWith('data:image')) {
                        console.warn(`Field ${field.id} (${field.type}) has invalid image data`);
                        continue;
                    }

                    const base64Data = field.value.split(',')[1];
                    if (!base64Data) {
                        console.warn(`Field ${field.id} (${field.type}) has no base64 data`);
                        continue;
                    }

                    const imageBytes = Buffer.from(base64Data, 'base64');

                    let image;
                    try {
                        if (field.value.includes('image/png') || field.value.includes('png')) {
                            image = await pdfDoc.embedPng(imageBytes);
                        } else if (field.value.includes('image/jpeg') || field.value.includes('image/jpg') || field.value.includes('jpg') || field.value.includes('jpeg')) {
                            image = await pdfDoc.embedJpg(imageBytes);
                        } else {
                            // Try PNG first as default
                            try {
                                image = await pdfDoc.embedPng(imageBytes);
                            } catch {
                                image = await pdfDoc.embedJpg(imageBytes);
                            }
                        }
                    } catch (imgError) {
                        console.error(`Failed to embed image for field ${field.id}:`, imgError);
                        continue;
                    }

                    if (image) {
                        page.drawImage(image, {
                            x: field.x,
                            y: pdfY,
                            width: field.width,
                            height: field.height,
                        });
                        console.log(`Drew ${field.type} field ${field.id} on page ${field.pageNumber}`);
                    }
                }
                // Handle text-based fields: text, date
                else if (field.type === 'text' || field.type === 'date') {
                    if (!field.value) continue;

                    // Calculate appropriate font size
                    const fontSize = Math.min(field.height * 0.6, 14);
                    const padding = 5;

                    page.drawText(String(field.value), {
                        x: field.x + padding,
                        y: pdfY + (field.height / 2) - (fontSize / 2),
                        size: fontSize,
                        font: font,
                        color: rgb(0, 0, 0),
                        maxWidth: field.width - (padding * 2),
                    });
                    console.log(`Drew ${field.type} field ${field.id}: "${field.value}"`);
                }
                // Handle checkbox
                else if (field.type === 'checkbox') {
                    const isChecked = field.value === 'true' || field.value === 'checked'

                    if (isChecked) {
                        const checkSize = Math.min(field.width, field.height) * 0.7;
                        const centerX = field.x + field.width / 2;
                        const centerY = pdfY + field.height / 2;

                        // Draw checkmark with X (ASCII character)
                        page.drawText('X', {
                            x: centerX - checkSize / 3,
                            y: centerY - checkSize / 3,
                            size: checkSize,
                            font: boldFont,
                            color: rgb(0, 0.5, 0),
                        });
                        console.log(`Drew checked checkbox field ${field.id}`);
                    } else {
                        console.log(`Skipped unchecked checkbox field ${field.id}`);
                    }
                }
                else {
                    console.warn(`Unknown field type: ${field.type} for field ${field.id}`);
                }
            } catch (fieldError) {
                console.error(`Error processing field ${field.id} (${field.type}):`, fieldError);
                // Continue with other fields
            }
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
        const fieldTypeCounts = version.fields.reduce((acc: any, field: any) => {
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
