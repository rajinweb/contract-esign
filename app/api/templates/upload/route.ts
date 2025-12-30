import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import TemplateModel from '@/models/Template';
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const tags = formData.get('tags') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ message: 'Template name is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ message: 'Category is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ message: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    if (pdfBuffer.length === 0) {
      return NextResponse.json({ message: 'File is empty' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const userDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Save file with unique name
    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join('uploads', userId, fileName);
    const absoluteFilePath = path.join(process.cwd(), filePath);

    fs.writeFileSync(absoluteFilePath, pdfBuffer);

    // Parse tags if provided
    const parsedTags = tags
      ? tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag)
      : [];

    // Create template record
    const newTemplate = new TemplateModel({
      userId,
      name,
      description,
      category,
      isSystemTemplate: false,
      templateFileUrl: `/api/templates/temp`, // temporary, will update after save
      filePath,
      fields: [],
      defaultSigners: [],
      pageCount: 1, // default value; could be enhanced with pdf-lib to count pages
      fileSize: pdfBuffer.length,
      tags: parsedTags,
      isActive: true,
    });

    await newTemplate.save();

    // Update with actual template ID
    newTemplate.templateFileUrl = `/api/templates/${newTemplate._id}`;
    await newTemplate.save();

    return NextResponse.json(
      {
        message: 'Template uploaded successfully',
        template: newTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      {
        message: 'An internal server error occurred',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
