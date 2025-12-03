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
        const { name, description, category, templateFileUrl, filePath, fields, defaultSigners, pageCount, fileSize, thumbnailUrl, tags } = data;

        if (!name || !templateFileUrl || !filePath) {
            return NextResponse.json({ message: 'Missing required fields: name, templateFileUrl, filePath' }, { status: 400 });
        }

        const template = new TemplateModel({
            userId,
            name,
            description: description || '',
            category: category || 'Other',
            templateFileUrl,
            filePath,
            thumbnailUrl,
            fields: fields || [],
            defaultSigners: defaultSigners || [],
            pageCount,
            fileSize,
            isSystemTemplate: false,
            isActive: true,
            tags: tags || [],
        });

        await template.save();

        return NextResponse.json({
            success: true,
            template,
            message: 'Template created successfully',
        });
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({ message: 'Failed to create template' }, { status: 500 });
    }
}
