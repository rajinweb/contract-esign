import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import DocumentModel from '@/models/Document';
import connectDB, { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 👇 Generate signing token
    const token = crypto.randomUUID();

    const newDoc = await DocumentModel.create({
      userId,
      token,
      pdfData: buffer,
      documentName: file.name,
    });

    return NextResponse.json({
      success: true,
      name: newDoc.documentName,
      token: newDoc.token, // 👈 this is your signing link token
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

