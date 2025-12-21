import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import Document from '@/models/Document';
import TemplateModel, { ITemplate } from '@/models/Template';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const userId = await getAuthSession(req);
        const { templateId, documentName: requestedDocName } = await req.json();

        if (!templateId) {
            return NextResponse.json({ message: 'Template ID is required' }, { status: 400 });
        }

        console.log(`[USE TEMPLATE] Received request for templateId: ${templateId}`);

        const template: ITemplate | null = await TemplateModel.findById(templateId).lean() as ITemplate | null;
        if (!template) {
            console.warn(`[USE TEMPLATE] Template with ID ${templateId} not found in database.`);
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        console.log(`[USE TEMPLATE] Found template: "${template.name}"`);
        console.log(`[USE TEMPLATE] Template's stored filePath: "${template.filePath}"`);


        // For guests, use the same ID for both ownerId and sessionId so they can access their documents
        let ownerId: string;
        let newSessionId: string;
        
        if (userId) {
            // Authenticated user: use their userId and generate a new sessionId
            ownerId = userId;
            newSessionId = uuidv4();
        } else {
            // Guest user: use the same ID for both ownerId and sessionId
            // This ensures the guestId parameter matches the document's userId
            const guestId = `guest_${uuidv4()}`;
            ownerId = guestId;
            newSessionId = guestId;
            console.log(`[USE TEMPLATE] No authenticated user. Creating new guest owner: ${ownerId}`);
        }

        const documentName = requestedDocName || `New Document from ${template.name}`;

        const userDir = path.join(process.cwd(), 'uploads', ownerId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        let pdfData: Buffer | null = null;
        const newFileName = `${uuidv4()}.pdf`;
        const newFilePath = path.join('uploads', ownerId, path.basename(newFileName));
        const newFileAbsolutePath = path.join(process.cwd(), newFilePath);

        // Try multiple strategies to find the template PDF file
        let originalFilePath: string | null = null;

        // Strategy 1: Use the stored filePath directly
        if (template.filePath) {
            const safeOriginalPath = path.normalize(template.filePath).replace(/^(\.\.[\/\\])+/, '');
            const candidatePath = path.join(process.cwd(), safeOriginalPath);
            console.log(`[USE TEMPLATE] Strategy 1: Checking stored filePath: ${candidatePath}`);
            
            if (fs.existsSync(candidatePath)) {
                originalFilePath = candidatePath;
                console.log(`[USE TEMPLATE] Strategy 1: Found file at stored filePath`);
            }
        }

        // Strategy 2: For system templates, try public/system-templates directory using templateFileUrl
        if (!originalFilePath && template.isSystemTemplate && template.templateFileUrl) {
            // Extract filename from templateFileUrl (e.g., /system-templates/filename.pdf)
            const urlPath = template.templateFileUrl.split('?')[0]; // Remove query params
            const fileName = path.basename(urlPath);
            const systemTemplatePath = path.join(process.cwd(), 'public', 'system-templates', fileName);
            
            console.log(`[USE TEMPLATE] Strategy 2: Checking system template from templateFileUrl: ${systemTemplatePath}`);
            if (fs.existsSync(systemTemplatePath)) {
                originalFilePath = systemTemplatePath;
                console.log(`[USE TEMPLATE] Strategy 2: Found system template at: ${originalFilePath}`);
            }
        }

        // Strategy 3: Try to extract filename from filePath and look in system-templates
        if (!originalFilePath && template.isSystemTemplate && template.filePath) {
            const fileName = path.basename(template.filePath);
            const systemTemplatePath = path.join(process.cwd(), 'public', 'system-templates', fileName);
            
            console.log(`[USE TEMPLATE] Strategy 3: Checking system template by filename from filePath: ${systemTemplatePath}`);
            if (fs.existsSync(systemTemplatePath)) {
                originalFilePath = systemTemplatePath;
                console.log(`[USE TEMPLATE] Strategy 3: Found system template by filename at: ${originalFilePath}`);
            }
        }

        // Now try to read the file if we found a valid path
        if (originalFilePath && fs.existsSync(originalFilePath)) {
            try {
                pdfData = fs.readFileSync(originalFilePath);
                console.log(`[USE TEMPLATE] Successfully read PDF from: ${originalFilePath}. Size: ${pdfData.length} bytes.`);
                fs.writeFileSync(newFileAbsolutePath, pdfData);
                console.log(`[USE TEMPLATE] Wrote new document PDF to: ${newFileAbsolutePath}`);
            } catch (readError) {
                console.error(`[USE TEMPLATE] Error reading file ${originalFilePath}:`, readError);
                pdfData = null;
                console.warn(`[USE TEMPLATE] Falling back to placeholder PDF due to file read error.`);
            }
        } else {
            console.warn(`[USE TEMPLATE] Could not locate template PDF file. Template filePath: "${template.filePath}", templateFileUrl: "${template.templateFileUrl}", isSystemTemplate: ${template.isSystemTemplate}. Will generate placeholder.`);
        }

        if (!pdfData) {
            console.log(`[USE TEMPLATE] PDF data is not available from template.filePath. Generating placeholder PDF.`);
            const placeholderPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000121 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF');
            fs.writeFileSync(newFileAbsolutePath, placeholderPdf);
            pdfData = placeholderPdf;
            console.log(`[USE TEMPLATE] Generated placeholder PDF. Size: ${pdfData.length} bytes. Wrote to: ${newFileAbsolutePath}`);
        }

        await TemplateModel.updateOne({ _id: templateId }, { $inc: { duplicateCount: 1 } });

        const newDocument = new Document({
            userId: ownerId,
            documentName,
            originalFileName: template.name,
            currentVersion: 1,
            currentSessionId: newSessionId,
            status: 'draft',
            isTemplate: false,
            versions: [{
                version: 1,
                fields: template.fields || [],
                documentName,
                filePath: newFilePath,
                pdfData: pdfData, // Add pdfData here
                status: 'draft',
                changeLog: `Created from template: ${template.name}`,
            }],
            recipients: template.defaultSigners || [],
            templateId: template._id,
        });

        await newDocument.save();

        console.log(`[USE TEMPLATE] Successfully created new document with ID: ${newDocument._id}`);

        return NextResponse.json({
            message: 'Document created from template successfully',
            documentId: newDocument._id.toString(),
            sessionId: newSessionId,
        }, { status: 201 });

    } catch (error) {
        console.error('[USE TEMPLATE] An internal server error occurred:', error);
        return NextResponse.json({
            message: 'An internal server error occurred',
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}