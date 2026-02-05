import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import Document from '@/models/Document';
import TemplateModel, { ITemplate } from '@/models/Template';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { sha256Buffer } from '@/lib/hash';
import { copyObject, getRegion, putObjectStream } from '@/lib/s3';

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const userId = await getAuthSession(req);
        const { templateId, documentName: requestedDocName, guestId } = await req.json();

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


        // For guests, use the provided guestId (validated) so they can access their documents
        let ownerId: string;
        let newSessionId: string;

        if (userId) {
            ownerId = userId;
            newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        } else {
            const safeGuestId =
                typeof guestId === 'string' && guestId.startsWith('guest_')
                    ? guestId
                    : `guest_${uuidv4()}`;
            ownerId = safeGuestId;
            newSessionId = safeGuestId;
            console.log(`[USE TEMPLATE] No authenticated user. Using guest owner: ${ownerId}`);
        }

        const documentName = requestedDocName || `New Document from ${template.name}`;

        let pdfData: Buffer | null = null;

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
            } catch (readError) {
                console.error(`[USE TEMPLATE] Error reading file ${originalFilePath}:`, readError);
                pdfData = null;
                console.warn(`[USE TEMPLATE] File read error. Cannot create document from template.`);
            }
        } else {
            console.warn(`[USE TEMPLATE] Could not locate template PDF file. Template filePath: "${template.filePath}", templateFileUrl: "${template.templateFileUrl}", isSystemTemplate: ${template.isSystemTemplate}. Will generate placeholder.`);
        }

        if (!pdfData) {
            return NextResponse.json({ message: 'Template PDF could not be located.' }, { status: 500 });
        }

        await TemplateModel.updateOne({ _id: templateId }, { $inc: { duplicateCount: 1 } });

        const hash = await sha256Buffer(pdfData);
        const size = pdfData.length;
        const mimeType = 'application/pdf';

        const bucket = process.env.S3_BUCKET_NAME;
        if (!bucket) {
            return NextResponse.json({ message: 'S3 bucket not configured.' }, { status: 500 });
        }

        const newDocument = new Document({
            userId: ownerId,
            documentName,
            originalFileName: template.name,
            currentVersion: 1,
            currentSessionId: newSessionId,
            status: 'draft',
            isTemplate: false,
            versions: [],
            recipients: (Array.isArray(template.defaultSigners) ? template.defaultSigners : [])
                .filter((r: any) => r?.email && r?.name && r?.role)
                .map((r: any) => ({
                    ...r,
                    id: r.id || `recipient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    signingToken: crypto.randomBytes(32).toString('hex'),
                    status: 'pending',
                    signedAt: null,
                    signedVersion: null,
                    approvedAt: null,
                    rejectedAt: null,
                    viewedAt: null,
                })),
            templateId: template._id,
        });

        const originalKey = `documents/${ownerId}/${newDocument._id}/original.pdf`;
        await putObjectStream({ bucket, key: originalKey, body: pdfData, contentType: mimeType, contentLength: size });

        const originalVersion = {
            version: 0,
            label: 'original' as const,
            storage: {
                provider: 's3',
                bucket,
                key: originalKey,
                region: getRegion(),
                url: `s3://${bucket}/${originalKey}`,
            },
            hash,
            hashAlgo: 'SHA-256',
            size,
            mimeType,
            locked: true,
            status: 'locked' as const,
            ingestionNote: `Created from template: ${template.name}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const preparedKey = `documents/${ownerId}/${newDocument._id}/prepared_1.pdf`;
        await copyObject({
            sourceBucket: bucket,
            sourceKey: originalKey,
            destinationBucket: bucket,
            destinationKey: preparedKey,
        });

        const sanitizedFields = Array.isArray(template.fields)
            ? template.fields.map((field: any) => {
                if (!field || typeof field !== 'object') return field;
                const { pageRect, ...rest } = field;
                return rest;
            })
            : [];

        const preparedVersion = {
            version: 1,
            label: 'prepared' as const,
            derivedFromVersion: 0,
            storage: {
                provider: 's3',
                bucket,
                key: preparedKey,
                region: getRegion(),
                url: `s3://${bucket}/${preparedKey}`,
            },
            hash,
            hashAlgo: 'SHA-256',
            size,
            mimeType,
            locked: false,
            fields: sanitizedFields,
            documentName,
            status: 'draft' as const,
            changeLog: `Created from template: ${template.name}`,
            editHistory: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        newDocument.versions.push(originalVersion, preparedVersion);

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
