import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import TemplateModel, { ITemplate } from '@/models/Template';
import DocumentModel from '@/models/Document';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

        // Load the original document; we treat it as 'any' here to avoid lean() union typing issues
        const originalDoc: any = await DocumentModel.findById(documentId).lean();
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

        const originalVersion = originalDoc.versions?.[originalDoc.currentVersion - 1];
        if (!originalVersion?.filePath) {
            return NextResponse.json({ message: 'Original document file path not found' }, { status: 400 });
        }

        const originalFilePath = path.join(process.cwd(), originalVersion.filePath);
        if (fs.existsSync(originalFilePath)) {
            fs.copyFileSync(originalFilePath, newFileAbsolutePath);
        } else {
            return NextResponse.json({ message: 'Original document file not found on server' }, { status: 500 });
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