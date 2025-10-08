import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentVersion, IDocumentRecipient } from '@/models/Document'
interface IDocument {
    _id: string;
    name: string;
    status: string;
    recipients: IDocumentRecipient[];
    versions: IDocumentVersion[];
}
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const token = req.nextUrl.searchParams.get('token');
        const recipientId = req.nextUrl.searchParams.get('recipient');

        if (!token) return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
        if (!recipientId) return NextResponse.json({ success: false, message: 'Recipient ID is required' }, { status: 400 });

        // Find the document and version that contains this signing token
        const document = await DocumentModel.findOne({ 'versions.signingToken': token }).lean<IDocument>();
        if (!document) return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });

        const version = document.versions.find((v) => v.signingToken === token);
        if (!version) return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });

        // verify expiry
        if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }
        const recipient = document.recipients.find(r => r.id.toString() === recipientId);
        if (!recipient) return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });
        const fieldsForRecipient = version.fields.filter(field => field.recipientId === recipientId);

        return NextResponse.json({
            success: true,
            document: {
                id: document._id.toString(),
                name: document.name || 'Untitled Document',
                fileUrl: `/api/signing-file?token=${token}`,
                fields: fieldsForRecipient || [],
                recipients: document.recipients || [],
            },
        });
    } catch (_err) {
        console.error('Error in sign-document:', _err);
        return NextResponse.json({ success: false, message: 'Failed to load document' }, { status: 500 });
    }
}
