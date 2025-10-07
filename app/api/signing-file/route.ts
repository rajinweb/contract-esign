import { NextRequest } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const token = req.nextUrl.searchParams.get('token');
        if (!token) {
            return new Response('Token is required', { status: 400 });
        }

        const document = await DocumentModel.findOne({ 'versions.signingToken': token });
        if (!document) {
            return new Response('Document not found', { status: 404 });
        }

        const version = document.versions.find((v: any) => v.signingToken === token);
        if (!version || !version.pdfData) {
            return new Response('PDF not found', { status: 404 });
        }

        return new Response(version.pdfData.buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename=document.pdf',
            },
        });
    } catch (err) {
        console.error('Error serving PDF:', err);
        return new Response('Failed to serve PDF', { status: 500 });
    }
}
