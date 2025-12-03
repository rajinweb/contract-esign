import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import Document from '@/models/Document';
import Template from '@/models/Template';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        // Get user if present (may be null for guests using system templates)
        const userId = await getAuthSession(req);

        const { templateId, documentName, guestId } = await req.json();

        if (!templateId || !documentName) {
            return NextResponse.json({ message: 'Template ID and document name are required' }, { status: 400 });
        }

        const template = await Template.findById(templateId);

        if (!template) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        // Allow guests to use system templates, but require auth for personal templates
        if (!userId && !template.isSystemTemplate) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Increment the duplicate count on the template
        template.duplicateCount = (template.duplicateCount || 0) + 1;
        await template.save();

        // Fetch template PDF data if available
        let pdfData: Buffer | undefined;

        if (template.templateFileUrl) {
            if (template.templateFileUrl.startsWith('http')) {
                // Fetch from absolute URL
                try {
                    const response = await fetch(template.templateFileUrl);
                    if (response.ok) {
                        pdfData = Buffer.from(await response.arrayBuffer());
                    } else {
                        console.warn(`Failed to fetch template from HTTP URL: ${template.templateFileUrl} (status: ${response.status})`);
                    }
                } catch (e) {
                    console.warn('Failed to fetch template from HTTP URL:', e);
                }
            } else if (template.templateFileUrl.startsWith('/')) {
                // Fetch from app-relative URL
                try {
                    // Use request URL to determine the base URL
                    const protocol = req.headers.get('x-forwarded-proto') || 'http';
                    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
                    const baseUrl = `${protocol}://${host}`;
                    const fullUrl = `${baseUrl}${template.templateFileUrl}`;

                    console.log(`Fetching template PDF from: ${fullUrl}`);
                    const response = await fetch(fullUrl);
                    if (response.ok) {
                        pdfData = Buffer.from(await response.arrayBuffer());
                        console.log(`Successfully fetched template PDF, size: ${pdfData.length} bytes`);
                    } else {
                        console.warn(`Failed to fetch template from app URL: ${fullUrl} (status: ${response.status})`);
                    }
                } catch (e) {
                    console.warn('Failed to fetch template from app URL:', e);
                }
            }
        }

        // If no PDF data, create a minimal PDF stub (valid PDF structure)
        if (!pdfData) {
            const minimalPDF = `%PDF-1.4
                1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
                2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
                3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
                4 0 obj<</Length 44>>stream
                BT
                /F1 12 Tf
                50 700 Td
                (Template Document) Tj
                ET
                endstream endobj
                xref
                0 5
                0000000000 65535 f
                0000000009 00000 n
                0000000058 00000 n
                0000000115 00000 n
                0000000206 00000 n
                trailer<</Size 5/Root 1 0 R>>
                startxref
                298
                %%EOF`;
            pdfData = Buffer.from(minimalPDF);
        }

        const newRecipients = (template.defaultSigners || []).map((signer: { name: string; email: string; role: string; }) => ({
            name: signer.name,
            email: signer.email,
            role: signer.role,
            status: 'pending',
        }));

        const newSessionId = uuidv4();

        // Create the uploads directory structure for the user
        // If guestId is provided from client, use it; otherwise fall back to userId or generate new guest ID
        const actualUserId = userId || guestId || `guest_${uuidv4()}`;
        const userDir = path.join(process.cwd(), 'uploads', actualUserId);
        fs.mkdirSync(userDir, { recursive: true });

        // Write the PDF file to the uploads directory
        const fileName = `${uuidv4()}.pdf`;
        const filePath = path.join(userDir, fileName);
        const pdfToWrite = pdfData && pdfData.length > 0 ? pdfData : Buffer.from('%PDF-1.4\n%Empty PDF');
        fs.writeFileSync(filePath, pdfToWrite);

        const newDocument = new Document({
            userId: actualUserId,
            documentName: documentName,
            originalFileName: `${template.name}.pdf`,
            currentVersion: 1,
            currentSessionId: newSessionId,
            status: 'draft',
            versions: [{
                version: 1,
                pdfData: pdfToWrite,
                fields: template.fields || [],
                documentName: documentName,
                filePath: filePath,
                status: 'draft',
                changeLog: `Created from template: ${template.name}`,
                editHistory: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            }],
            recipients: newRecipients,
        });

        await newDocument.save();

        return NextResponse.json({
            message: 'Document created from template successfully',
            documentId: newDocument._id,
            sessionId: newSessionId,
        }, { status: 201 });

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Error creating document from template:', errMsg, error);
        return NextResponse.json({ message: 'Failed to create document from template', error: errMsg }, { status: 500 });
    }
}
