import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import TemplateModel from '@/models/Template';

// GET - Load a template with its fields
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    // Templates can be loaded by anyone if they are system templates,
    // or by the owner if they are user-created.
    // For editing a duplicated template, the user MUST be authenticated.
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('id');
    console.log(`[LOAD TEMPLATE] Attempting to load template with ID: ${templateId}`);

    if (!templateId) {
      return NextResponse.json({ message: 'Template ID missing' }, { status: 400 });
    }

    const template = await TemplateModel.findById(templateId);

    if (!template) {
      return NextResponse.json({ message: 'Template not found by ID' }, { status: 404 });
    }

    // Authorization check for user-created templates
    if (!template.isSystemTemplate && template.userId.toString() !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // For now, templates don't have versions like documents.
    // We assume fields are directly on the template object.
    const fields = template.fields || [];

    console.log(`[LOAD TEMPLATE] Returning ${fields.length} fields for template ${template.name}`);

    const responseTemplate = {
      _id: template._id,
      templateId: template._id, // Add templateId for consistency
      name: template.name,
      filePath: template.filePath,
      fields: fields,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isSystemTemplate: template.isSystemTemplate,
      category: template.category,
      description: template.description,
      defaultSigners: template.defaultSigners,
      pageCount: template.pageCount,
      fileSize: template.fileSize,
      tags: template.tags,
    };

    return NextResponse.json({ success: true, template: responseTemplate });
  } catch (error) {
    console.error('API Error in GET', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
