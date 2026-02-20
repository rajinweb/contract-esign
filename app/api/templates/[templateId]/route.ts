import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import TemplateModel from '@/models/Template';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { normalizeFieldOwner } from '@/lib/field-normalization';
import { randomUUID } from 'crypto';

type RouteContext = {
  params: Promise<{ templateId: string }>
}

const TEMPLATE_CATEGORIES = new Set(['HR', 'Legal', 'Sales', 'Finance', 'Other']);
const TEMPLATE_ROLES = new Set(['signer', 'approver', 'viewer']);

function sanitizeTemplateFields(fields: unknown) {
  if (!Array.isArray(fields)) return [];

  return fields
    .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === 'object')
    .map((field) => {
      const pageRectSource =
        field.pageRect && typeof field.pageRect === 'object'
          ? (field.pageRect as Record<string, unknown>)
          : null;
      const pageRect =
        pageRectSource
          ? {
              x: typeof pageRectSource.x === 'number' ? pageRectSource.x : undefined,
              y: typeof pageRectSource.y === 'number' ? pageRectSource.y : undefined,
              width: typeof pageRectSource.width === 'number' ? pageRectSource.width : undefined,
              height: typeof pageRectSource.height === 'number' ? pageRectSource.height : undefined,
              top: typeof pageRectSource.top === 'number' ? pageRectSource.top : undefined,
              right: typeof pageRectSource.right === 'number' ? pageRectSource.right : undefined,
              bottom: typeof pageRectSource.bottom === 'number' ? pageRectSource.bottom : undefined,
              left: typeof pageRectSource.left === 'number' ? pageRectSource.left : undefined,
            }
          : undefined;

      const cleanedPageRect =
        pageRect && Object.values(pageRect).some((value) => typeof value === 'number')
          ? pageRect
          : undefined;

      return {
        ...field,
        id: String(field.id ?? ''),
        pageRect: cleanedPageRect,
        fieldOwner: normalizeFieldOwner(field),
      };
    })
    .filter((field) => field.id.length > 0);
}

function sanitizeDefaultSigners(defaultSigners: unknown) {
  if (!Array.isArray(defaultSigners)) return [];

  return defaultSigners
    .filter((signer): signer is Record<string, unknown> => Boolean(signer) && typeof signer === 'object')
    .map((signer, index) => {
      const role =
        typeof signer.role === 'string' && TEMPLATE_ROLES.has(signer.role)
          ? signer.role
          : 'signer';
      const id =
        typeof signer.id === 'string' && signer.id.trim().length > 0
          ? signer.id.trim()
          : `recipient_${randomUUID()}`;

      return {
        id,
        name: typeof signer.name === 'string' ? signer.name.trim() : '',
        email: typeof signer.email === 'string' ? signer.email.trim() : '',
        role,
        order: typeof signer.order === 'number' ? signer.order : index + 1,
      };
    });
}

function sanitizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
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

    // Delete the template from the database.
    // Use a compatibility owner filter because legacy rows may store `userId` as ObjectId.
    const deleteFilter: Record<string, unknown> = {
      _id: paramTemplateId,
      isSystemTemplate: false,
      $or: [
        { userId },
        { $expr: { $eq: [{ $toString: '$userId' }, userId] } },
      ],
    };

    const deleteResult = await TemplateModel.deleteOne(deleteFilter);
    if (!deleteResult.deletedCount) {
      return NextResponse.json({ message: 'Template not found or already deleted' }, { status: 404 });
    }

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

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { templateId: paramTemplateId } = await context.params;
    if (!paramTemplateId || !mongoose.Types.ObjectId.isValid(paramTemplateId)) {
      return NextResponse.json({ message: 'Invalid template ID' }, { status: 400 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const template = await TemplateModel.findById(paramTemplateId);
    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }
    if (template.isSystemTemplate) {
      return NextResponse.json({ message: 'Cannot edit system templates. Duplicate first.' }, { status: 403 });
    }
    if (!template.userId || template.userId.toString() !== userId) {
      return NextResponse.json({ message: 'Forbidden: You can only edit your own templates' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        return NextResponse.json({ message: 'Template name is required' }, { status: 400 });
      }
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      updates.description = typeof payload.description === 'string' ? payload.description.trim() : '';
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
      const category = typeof payload.category === 'string' ? payload.category : '';
      if (!TEMPLATE_CATEGORIES.has(category)) {
        return NextResponse.json({ message: 'Invalid template category' }, { status: 400 });
      }
      updates.category = category;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
      updates.tags = sanitizeTags(payload.tags);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'fields')) {
      updates.fields = sanitizeTemplateFields(payload.fields);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'defaultSigners')) {
      updates.defaultSigners = sanitizeDefaultSigners(payload.defaultSigners);
    }

    Object.assign(template, updates);
    await template.save();

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
        updatedAt: template.updatedAt,
        duplicateCount: template.duplicateCount,
        fields: template.fields,
        defaultSigners: template.defaultSigners,
      },
    });
  } catch (error) {
    console.error('[UPDATE TEMPLATE] API Error in PUT', error);
    return NextResponse.json({
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
