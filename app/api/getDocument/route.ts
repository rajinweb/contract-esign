import { NextRequest } from 'next/server';
import connectDB, { getDocumentByToken } from '@/utils/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        if (!token) return new Response('No token provided', { status: 400 });

        const doc = await getDocumentByToken(token);
        console.log("Document found:", doc);

        if (!doc) return new Response('Invalid or expired signing link', { status: 404 });
        if (!doc.pdfData || doc.pdfData.length === 0) return new Response('PDF not found', { status: 404 });

        return new Response(new Uint8Array(doc.pdfData), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="document.pdf"`,
            },
        });
    } catch (err) {
        console.error('Error fetching document:', err);
        return new Response('Internal Server Error', { status: 500 });
    }
}
