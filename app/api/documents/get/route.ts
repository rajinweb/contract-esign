import { NextRequest } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel, { IDocumentVersion } from '@/models/Document';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    const folder = req.nextUrl.searchParams.get('folder') || '';
    const name = req.nextUrl.searchParams.get('name') || '';

    try {
        await connectDB();

        // Public token-based access (signing links)
        if (token) {
            const doc = await DocumentModel.findOne({ token }).exec();
            if (!doc) return new Response('Error: Invalid or expired signing link', { status: 400 });
            // If pdfData is stored in DB, use it; otherwise try reading latest version filePath
            const v = doc.versions?.[doc.currentVersion - 1];
            if (v && v.pdfData) {
                return new Response(new Uint8Array(v.pdfData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${doc.documentName || 'document'}.pdf"` },
                });
            }
            // fallback: try reading filePath
            const fp = v?.filePath;
            if (fp && fs.existsSync(fp)) {
                const buf = fs.readFileSync(fp);
                return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
            }
            return new Response('Document data not available', { status: 404 });
        }

        // Authenticated file access by folder+name (used by dashboard/builder)
        const userId = await getUserIdFromReq(req);
        if (!userId) return new Response('Unauthorized', { status: 401 });

        // If folder+name provided, try to read file directly from uploads
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        if (folder && name) {
            const candidate = path.resolve(path.join(uploadsRoot, folder, name));
            if (!candidate.startsWith(path.resolve(uploadsRoot))) return new Response('Invalid path', { status: 400 });
            if (!fs.existsSync(candidate)) return new Response('Not found', { status: 404 });
            // basic ownership: folder should match userId
            if (folder !== userId) return new Response('Forbidden', { status: 403 });
            const buf = fs.readFileSync(candidate);
            return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
        }

        // If folder missing but name provided, try to find document by fileName in DB and check ownership
        if (name) {
            // normalize name to include .pdf if needed
            const nameWithExt = path.extname(name) ? name : `${name}.pdf`;

            // normalize name to include .pdf if needed has been done above

            // Normal lookup: prefer exact match with extension
            let doc = await DocumentModel.findOne({ $or: [{ originalFileName: nameWithExt }, { 'versions.fileName': nameWithExt }], userId }).exec();

            // fallback: try same-name without extension in DB records
            if (!doc) {
                const nameNoExt = path.basename(nameWithExt, path.extname(nameWithExt));
                doc = await DocumentModel.findOne({ $or: [{ originalFileName: nameNoExt }, { 'versions.fileName': nameNoExt }], userId }).exec();
            }

            if (!doc) return new Response('Not found', { status: 404 });

            // find matching version by fileName (with extension), fallback to current
            const version = doc.versions.find((v: IDocumentVersion) => v.fileName === nameWithExt) || doc.versions[doc.currentVersion - 1];
            if (version?.pdfData) return new Response(new Uint8Array(version.pdfData), { status: 200, headers: { 'Content-Type': 'application/pdf' } });

            // If the recorded filePath exists, return it
            if (version?.filePath && fs.existsSync(version.filePath)) {
                const buf = fs.readFileSync(version.filePath);
                return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
            }

            // As a helpful fallback, try reading by originalFileName path
            const origPath = path.join(uploadsRoot, String(doc.userId), doc.originalFileName || '');
            if (doc.originalFileName && fs.existsSync(origPath)) {
                const buf = fs.readFileSync(origPath);
                return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
            }

            return new Response('Document data not available', { status: 404 });
        }

        return new Response('Missing parameters', { status: 400 });
    } catch (error) {
        console.error('Get document error:', error);
        return new Response('Failed to fetch document', { status: 500 });
    }
}
