import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentVersion, IDocumentRecipient } from '@/models/Document';
import { updateDocumentStatus } from '@/lib/statusLogic';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { token, recipientId, fields } = await req.json();

        if (!token) return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
        if (!recipientId) return NextResponse.json({ success: false, message: 'Recipient ID is required' }, { status: 400 });

        const document = await DocumentModel.findOne({ 'versions.signingToken': token });
        if (!document) return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });

        const version = document.versions.find((v: IDocumentVersion) => v.signingToken === token);
        if (!version) return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });

        if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }

        const recipient = document.recipients.find((r: IDocumentRecipient) => r.id.toString() === recipientId);
        if (!recipient) return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });

        recipient.status = 'signed';
        recipient.signedAt = new Date();
        version.fields = fields;

        updateDocumentStatus(document);

        await document.save();

        return NextResponse.json({ success: true, message: 'Document signed successfully' });
    } catch (_err) {
        console.error('Error in sign-document:', _err);
        return NextResponse.json({ success: false, message: 'Failed to sign document' }, { status: 500 });
    }
}

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

        const version = document.versions.find((v: IDocumentVersion) => v.signingToken === token);
        if (!version) return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });

        // verify expiry
        if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }
        const recipient = document.recipients.find((r: IDocumentRecipient) => r.id.toString() === recipientId);
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
