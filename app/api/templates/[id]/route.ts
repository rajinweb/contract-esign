import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import { getUserIdFromReq } from '@/lib/auth';
import TemplateModel from '@/models/Template';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const templateId = (await context.params).id;
        const template = await TemplateModel.findById(templateId);

        if (!template) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        // Check permissions: user can view own templates or any system templates
        if (!template.isSystemTemplate && template.userId !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ success: true, template });
    } catch (error) {
        console.error('Error fetching template:', error);
        return NextResponse.json({ message: 'Failed to fetch template' }, { status: 500 });
    }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const templateId = (await context.params).id;
        const template = await TemplateModel.findById(templateId);

        if (!template) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        // Check permissions: only owner can edit
        if (template.userId !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const data = await req.json();
        const { name, description, category, fields, defaultSigners, tags } = data;

        if (name) template.name = name;
        if (description !== undefined) template.description = description;
        if (category) template.category = category;
        if (fields) template.fields = fields;
        if (defaultSigners) template.defaultSigners = defaultSigners;
        if (tags) template.tags = tags;

        await template.save();

        return NextResponse.json({
            success: true,
            template,
            message: 'Template updated successfully',
        });
    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json({ message: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const templateId = (await context.params).id;
        const template = await TemplateModel.findById(templateId);

        if (!template) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        // Check permissions: only owner can delete
        if (template.userId !== userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // Soft delete
        template.isActive = false;
        await template.save();

        return NextResponse.json({
            success: true,
            message: 'Template deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json({ message: 'Failed to delete template' }, { status: 500 });
    }
}
