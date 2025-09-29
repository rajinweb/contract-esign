import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
      const userId = await getUserIdFromReq(req);
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  
      const userDir = path.join(process.cwd(), 'uploads', userId);
      fs.mkdirSync(userDir, { recursive: true });
  
      const folder = crypto.randomBytes(8).toString('hex');
      const folderPath = path.join(userDir, folder);
      fs.mkdirSync(folderPath, { recursive: true });
  
      const filePath = path.join(folderPath, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
  
      return NextResponse.json({
        success: true,
        name: file.name,
        folder,
        path: filePath,
      });
    } catch (err) {
      console.error('Upload error:', err);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
  
