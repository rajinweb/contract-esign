import { NextRequest } from 'next/server';
import connectDB, { getDocumentByToken } from '@/utils/db';
import { IDocument } from '@/types/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        if (!token) {
            return new Response('No token provided', { status: 400 });
        }

        const doc: IDocument | null = await getDocumentByToken(token);
        if (!doc) {
            console.log('Document not found for token:', token);
            return new Response('Invalid or expired signing link', { status: 404 });
        }

        const currentVersionIndex = doc.currentVersion - 1;
        const versionData = doc.versions[currentVersionIndex];
        if (!versionData || !versionData.pdfData) {
            return new Response('PDF not found', { status: 404 });
        }

        // Convert Node.js Buffer to Uint8Array for Response
        const pdfArray = new Uint8Array(versionData.pdfData);

        return new Response(pdfArray, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${doc.originalFileName || 'document.pdf'}"`,
            },
        });
    } catch (err) {
        console.error('Error fetching document:', err);
        return new Response('Internal Server Error', { status: 500 });
    }
}
