import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import TemplateModel from '@/models/Template';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

type RouteContext = {
  params: Promise<{ templateId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthSession(req);
    const { templateId: paramTemplateId } = await context.params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format'); // Check if JSON format is requested

    if (!paramTemplateId || !mongoose.Types.ObjectId.isValid(paramTemplateId)) {
      return NextResponse.json({ message: 'Invalid template ID' }, { status: 400 });
    }

    const template = await TemplateModel.findById(paramTemplateId);

    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Authorization: User must be the owner of a non-system template
    // System templates can be accessed by anyone (already duplicated to user's own editable version)
    if (!template.isSystemTemplate && (!userId || template.userId.toString() !== userId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // If JSON format is requested, return template data as JSON
    if (format === 'json' || req.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({
        success: true,
        template: {
          _id: template._id,
          templateId: template._id,
          name: template.name,
          description: template.description,
          category: template.category,
          isSystemTemplate: template.isSystemTemplate,
          templateFileUrl: template.templateFileUrl,
          thumbnailUrl: template.thumbnailUrl,
          pageCount: template.pageCount,
          tags: template.tags,
          createdAt: template.createdAt,
          duplicateCount: template.duplicateCount,
          fields: template.fields,
          defaultSigners: template.defaultSigners,
        },
      });
    }

    // Otherwise, return the PDF file
    // Resolve file path (handle both relative and absolute paths)
    let fileAbsolutePath: string | null = null;
    if (template.filePath) {
      // Try as relative path first
      const relativePath = path.join(process.cwd(), template.filePath);
      if (fs.existsSync(relativePath)) {
        fileAbsolutePath = relativePath;
      } else if (fs.existsSync(template.filePath)) {
        // Try as absolute path
        fileAbsolutePath = template.filePath;
      }
    }

    if (fileAbsolutePath) {
      const fileBuffer = fs.readFileSync(fileAbsolutePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${template.name || 'template'}.pdf"`,
        },
      });
    } else {
      console.warn(`[SERVE TEMPLATE PDF] File not found for template ID ${template._id} at path: ${template.filePath}`);
      return NextResponse.json({ message: 'Template file not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error in GET', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { templateId: paramTemplateId } = await context.params;

    if (!paramTemplateId || !mongoose.Types.ObjectId.isValid(paramTemplateId)) {
      return NextResponse.json({ message: 'Invalid template ID' }, { status: 400 });
    }

    const template = await TemplateModel.findById(paramTemplateId);

    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Authorization: User must be the owner of the template, and it cannot be a system template
    if (template.isSystemTemplate) {
      return NextResponse.json({ message: 'Cannot delete system templates' }, { status: 403 });
    }

    if (!template.userId || template.userId.toString() !== userId) {
      return NextResponse.json({ message: 'Forbidden: You can only delete your own templates' }, { status: 403 });
    }

    // Delete associated file from the filesystem
    if (template.filePath) {
      try {
        // Ensure the path is within the project's uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const absoluteFilePath = path.resolve(path.join(process.cwd(), template.filePath));

        if (absoluteFilePath.startsWith(uploadsDir)) {
          if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
            console.log(`[DELETE TEMPLATE] Deleted file: ${absoluteFilePath}`);
          } else {
            console.warn(`[DELETE TEMPLATE] File not found at path: ${absoluteFilePath}`);
          }
        } else {
          console.warn(`[DELETE TEMPLATE] Attempted to delete a file outside of the uploads directory: ${template.filePath}`);
        }
      } catch (err) {
        console.error(`[DELETE TEMPLATE] Failed to delete file ${template.filePath}:`, err);
        // Continue to delete the DB record even if file deletion fails
      }
    }

    // Delete the template from the database
    await TemplateModel.deleteOne({ _id: paramTemplateId, userId });

    console.log(`[DELETE TEMPLATE] Successfully deleted template ${paramTemplateId}`);

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[DELETE TEMPLATE] API Error in DELETE', error);
    return NextResponse.json({
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}