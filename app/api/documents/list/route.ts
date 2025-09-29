import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(userDir)) return NextResponse.json({ files: [] });

    const files: { name: string; folder: string }[] = [];

    const folders = fs.readdirSync(userDir, { withFileTypes: true });
    for (const folder of folders) {
    if (folder.isDirectory()) {
        const folderFiles = fs.readdirSync(path.join(userDir, folder.name));
        folderFiles.forEach(file => files.push({ name: file, folder: folder.name }));
    } else if (folder.isFile()) {
        files.push({ name: folder.name, folder: '' });
    }
    }

    return NextResponse.json({ files });
}