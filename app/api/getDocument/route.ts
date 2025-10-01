import { NextRequest } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        if (!token) {
            return new Response('No token provided', { status: 400 });
        }

        // Find the document/version that has this signing token on a version
        const document = await DocumentModel.findOne({ 'versions.signingToken': token });
        if (!document) {
            console.log('Document not found for token:', token);
            return new Response('Invalid or expired signing link', { status: 404 });
        }

        const version = document.versions.find((v: { signingToken?: string; pdfData?: Uint8Array; expiresAt?: Date }) => v.signingToken === token);
        if (!version || !version.pdfData) {
            return new Response('PDF not found', { status: 404 });
        }

        // Check expiry
        if (version.expiresAt && new Date() > version.expiresAt) {
            return new Response('Document has expired', { status: 410 });
        }

        const pdfArray = new Uint8Array(version.pdfData);
        return new Response(pdfArray, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${document.originalFileName || document.documentName || 'document'}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
