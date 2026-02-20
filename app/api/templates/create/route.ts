import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import TemplateModel from '@/models/Template';
import DocumentModel from '@/models/Document';
import type { IVersionDoc } from '@/models/Document';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getObjectStream, getRegion } from '@/lib/s3';
import { getLatestPreparedVersion } from '@/lib/signing-utils';
import { pipeline } from 'stream/promises';

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const userId = await getAuthSession(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            description,
            category,
            fields,
            defaultSigners,
            pageCount,
            fileSize,
            tags,
            templateFileUrl, // URL to access the template PDF
            documentId // The ID of the document to use as a base
        } = body;

        if (!name || !documentId) {
            return NextResponse.json({ message: 'Template name and document ID are required' }, { status: 400 });
        }

        const originalDoc = await DocumentModel.findById(documentId).lean<{
            userId: { toString(): string };
            versions?: IVersionDoc[];
            currentVersion?: number;
            fields?: unknown[];
        } | null>();
        if (!originalDoc) {
            return NextResponse.json({ message: 'Original document not found' }, { status: 404 });
        }

        if (originalDoc.userId.toString() !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const userDir = path.join(process.cwd(), 'uploads', userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        const newFileName = `${uuidv4()}.pdf`;
        const newFilePath = path.join('uploads', userId, newFileName);
        const newFileAbsolutePath = path.join(process.cwd(), newFilePath);

        const preparedVersion = getLatestPreparedVersion(originalDoc.versions || []);
        const currentVersion =
            originalDoc.versions?.find((v: IVersionDoc) => v?.version === originalDoc.currentVersion) || null;
        const fallbackOriginal = originalDoc.versions?.find((v: IVersionDoc) => v?.label === 'original') || null;
        const sourceVersion = preparedVersion || currentVersion || fallbackOriginal || originalDoc.versions?.[0];

        if (!sourceVersion) {
            return NextResponse.json({ message: 'Original document version not found' }, { status: 400 });
        }

        const sourceFilePath = (sourceVersion as IVersionDoc & { filePath?: string })?.filePath;
        if (sourceFilePath && fs.existsSync(sourceFilePath)) {
            fs.copyFileSync(sourceFilePath, newFileAbsolutePath);
        } else if (sourceVersion?.storage?.provider === 's3' && sourceVersion.storage.key) {
            const bucket = sourceVersion.storage.bucket || process.env.S3_BUCKET_NAME;
            if (!bucket) {
                return NextResponse.json({ message: 'S3 bucket not configured for template creation' }, { status: 500 });
            }
            const region = sourceVersion.storage.region || getRegion();
            const stream = await getObjectStream({ bucket, key: sourceVersion.storage.key, region });
            await pipeline(stream, fs.createWriteStream(newFileAbsolutePath));
        } else {
            return NextResponse.json({ message: 'Original document file path not found' }, { status: 400 });
        }

        // Generate templateFileUrl if not provided
        // After saving, we'll update it with the actual template ID
        const tempTemplateFileUrl = templateFileUrl || `/api/templates/temp`;

        const newTemplate = new TemplateModel({
            userId,
            name,
            description,
            category,
            isSystemTemplate: false,
            templateFileUrl: tempTemplateFileUrl,
            filePath: newFilePath, // Use relative path, not absolute
            fields: fields || originalDoc.fields,
            defaultSigners: defaultSigners !== undefined ? defaultSigners : [], // Don't include recipients from original document
            pageCount: pageCount || originalDoc.versions?.length,
            fileSize,
            tags,
            isActive: true,
        });

        await newTemplate.save();

        // Update templateFileUrl with the actual template ID (always use template URL, not document URL)
        newTemplate.templateFileUrl = `/api/templates/${newTemplate._id}`;
        await newTemplate.save();

        return NextResponse.json({
            message: 'Template created successfully',
            template: newTemplate,
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({
            message: 'An internal server error occurred',
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
