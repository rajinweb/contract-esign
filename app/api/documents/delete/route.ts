import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || '';
    const name = searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'No file specified' }, { status: 400 });
    
    const filePath = folder
        ? path.join(process.cwd(), 'uploads', userId, folder, name)
        : path.join(process.cwd(), 'uploads', userId, name);
    
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    
    try {
        fs.unlinkSync(filePath);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}