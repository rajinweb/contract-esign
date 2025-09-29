import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const userId = await getUserIdFromReq(req);
    if (!userId) return new Response('Unauthorized', { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || '';
    const name = searchParams.get('name');
    if (!name) return new Response('No file specified', { status: 400 });
    
    const filePath = folder
        ? path.join(process.cwd(), 'uploads', userId, folder, name)
        : path.join(process.cwd(), 'uploads', userId, name);
    
    if (!fs.existsSync(filePath)) return new Response('File not found', { status: 404 });
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    // Handle range requests
    const rangeHeader = req.headers.get('range');
    let start = 0;
    let end = fileSize - 1;
    
    if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
        if (match) {
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : end;
        }
    }
    
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const stream = new ReadableStream({
        start(controller) {
        nodeStream.on('data', chunk => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', err => controller.error(err));
        }
    });
    
    const headers = new Headers({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${name}"`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start + 1).toString(),
    });
    
    if (rangeHeader) headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    
    return new Response(stream, { status: rangeHeader ? 206 : 200, headers });
    }