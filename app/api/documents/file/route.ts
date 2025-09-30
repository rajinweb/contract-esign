import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const p = url.searchParams.get('path');
    if (!p) return NextResponse.json({ message: 'Missing path' }, { status: 400 });

    const filePath = decodeURIComponent(p);
    console.log('file route request', { userId, requested: filePath });
    const uploadsRoot = path.join(process.cwd(), 'uploads');

    // Ensure the file is under uploads directory
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadsRoot))) {
      return NextResponse.json({ message: 'Invalid file path' }, { status: 400 });
    }

    // Basic ownership check: ensure the path contains the userId folder
    if (!resolved.includes(path.join(path.sep, userId, path.sep)) && !resolved.endsWith(path.join(path.sep, userId))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(resolved)) {
      console.warn('file route not found', { resolved });
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(resolved);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' }
    });
  } catch (error) {
    console.error('file route error', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
