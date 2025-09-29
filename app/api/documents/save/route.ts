import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getUserIdFromReq } from '@/utils/db'; // adjust if your user auth helper is elsewhere

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentName = formData.get('documentName') as string;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Save the file to disk (or upload to S3, etc.)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to a user-specific folder (ensure this exists or create it)
    const savePath = path.join(process.cwd(), 'uploads', userId);
    await mkdir(savePath, { recursive: true });

    const filePath = path.join(savePath, documentName || `document-${Date.now()}.pdf`);
    await writeFile(filePath, buffer);

    // Optionally, save a record in your DB here

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    console.error('Error saving PDF:', error);
    return NextResponse.json({ message: 'Failed to save PDF' }, { status: 500 });
  }
}