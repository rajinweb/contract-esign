import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';
import { getUserIdFromReq } from '@/utils/db';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const documentId = (searchParams.get('documentId') || '').trim();
    const name = searchParams.get('name');
    if (!documentId || !name) return NextResponse.json({ error: 'No documentId specified' }, { status: 400 });
    const doc = await DocumentModel.findOne({ _id: documentId, userId });
    const filePath = path.join(process.cwd(), 'uploads', userId, name);

    if (!doc || !fs.existsSync(filePath)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    for (const version of doc.versions) {
        try {
            fs.unlinkSync(filePath);
            if (fs.existsSync(version.filePath)) {
                fs.unlinkSync(version.filePath);

            }
        } catch (err) {
            console.error('Failed to delete file:', version.filePath, err);
        }
    }
    await DocumentModel.deleteOne({ _id: documentId, userId });
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
}