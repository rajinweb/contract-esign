import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document'

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const token = req.nextUrl.searchParams.get('token');
        const recipientId = req.nextUrl.searchParams.get('recipient');

        if (!token) return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
        if (!recipientId) return NextResponse.json({ success: false, message: 'Recipient ID is required' }, { status: 400 });

        // Find the document and version that contains this signing token
        // Don't use .lean() to ensure we get fresh data from DB
        const document = await DocumentModel.findOne({ 'versions.signingToken': token });
        if (!document) return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });

        const version = document.versions.find((v: { signingToken: string; }) => v.signingToken === token);
        if (!version) return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });

        // verify expiry
        if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }
        const recipient = document.recipients.find((r: { id: { toString: () => string; }; }) => r.id.toString() === recipientId);
        if (!recipient) return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });

        //  console.log('Returning recipients to client:', JSON.stringify(document.recipients, null, 2));

        return NextResponse.json({
            success: true,
            document: {
                id: document._id.toString(),
                name: document?.documentName || 'Untitled Document',
                fileUrl: `/api/documents/${document._id}?token=${token}`,
                fields: version.fields || [],
                recipients: document.recipients || [],
                status: document.status
            },
        });
    } catch (_err) {
        console.error('Error in sign-document:', _err);
        return NextResponse.json({ success: false, message: 'Failed to load document' }, { status: 500 });
    }
}
