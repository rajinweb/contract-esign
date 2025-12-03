import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import { getUserIdFromReq } from '@/lib/auth';
import TemplateModel from '@/models/Template';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { templateId } = data;

        if (!templateId) {
            return NextResponse.json({ message: 'templateId is required' }, { status: 400 });
        }

        const originalTemplate = await TemplateModel.findById(templateId);
        if (!originalTemplate) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        // Create a copy
        const copiedTemplate = new TemplateModel({
            userId, // new owner is the current user
            name: `${originalTemplate.name} (Copy)`,
            description: originalTemplate.description,
            category: originalTemplate.category,
            templateFileUrl: originalTemplate.templateFileUrl,
            filePath: originalTemplate.filePath,
            thumbnailUrl: originalTemplate.thumbnailUrl,
            fields: JSON.parse(JSON.stringify(originalTemplate.fields)), // deep copy
            defaultSigners: JSON.parse(JSON.stringify(originalTemplate.defaultSigners)),
            pageCount: originalTemplate.pageCount,
            fileSize: originalTemplate.fileSize,
            isSystemTemplate: false, // copied from system template but user-owned
            isActive: true,
            tags: [...(originalTemplate.tags || [])],
        });

        await copiedTemplate.save();

        // Increment duplicate count on original
        originalTemplate.duplicateCount = (originalTemplate.duplicateCount || 0) + 1;
        await originalTemplate.save();

        return NextResponse.json({
            success: true,
            template: copiedTemplate,
            message: 'Template duplicated successfully',
        });
    } catch (error) {
        console.error('Error duplicating template:', error);
        return NextResponse.json({ message: 'Failed to duplicate template' }, { status: 500 });
    }
}
