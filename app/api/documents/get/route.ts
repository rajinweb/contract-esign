import { NextRequest } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
        return new Response('Token is required', { status: 400 });
    }

    try {
        await connectDB();

        const doc = await DocumentModel.findOne({ token }).exec();
        if (!doc) {
            return new Response('Error: Invalid or expired signing link', { status: 400 });
        }

        return new Response(new Uint8Array(doc.pdfData), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${doc.documentName || 'document'}.pdf"`,
            },
        });
    } catch (err) {
        console.error('Get document error:', err);
        return new Response('Failed to fetch document', { status: 500 });
    }
}
