import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentVersion, IDocumentRecipient } from '@/models/Document';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { recipientId, token, action } = await req.json();

        if (!token) return NextResponse.json({ message: 'Token is required' }, { status: 400 });

        // Find the document and version that contains this signing token
        const document = await DocumentModel.findOne({ 'versions.signingToken': token });
        if (!document) {
            return NextResponse.json({ message: 'Invalid or expired signing link' }, { status: 404 });
        }

        const version = document.versions.find((v: IDocumentVersion) => v.signingToken === token);
        if (!version) return NextResponse.json({ message: 'Version not found' }, { status: 404 });

        // verify expiry
        if (version.expiresAt && new Date() > version.expiresAt) {
            return NextResponse.json({ message: 'Signing link has expired' }, { status: 410 });
        }

        // find recipient
        const recipient = (document.recipients as IDocumentRecipient[] | undefined)?.find((r: IDocumentRecipient) => r.id === recipientId);
        if (!recipient) {
            return NextResponse.json({ message: 'Recipient not found for this document' }, { status: 404 });
        }

        if (recipient.role === 'signer') {
            if (action !== 'signed') {
                return NextResponse.json({ message: `Signers must use action "signed"` }, { status: 400 });
            }
            recipient.status = 'signed';
            recipient.signedAt = new Date();
        }
        else if (recipient.role === 'approver') {
            if (action !== 'approved' && action !== 'rejected') {
                return NextResponse.json({ message: `Approvers must use action "approved" or "rejected"` }, { status: 400 });
            }
            recipient.status = action;
            recipient.signedAt = new Date();
        }
        else if (recipient.role === 'viewer') {
            return NextResponse.json({ message: 'Viewers cannot take any actions' }, { status: 400 });
        }

        // IMPORTANT: Mark recipients array as modified so Mongoose saves it
        document.markModified('recipients');

        // If all signers are signed, mark version/document as signed
        const allSignersDone = (document.recipients as IDocumentRecipient[])
            .filter((r: IDocumentRecipient) => r.role !== 'viewer')
            .every((r: IDocumentRecipient) => r.status === 'signed' || r.status === 'approved');

        if (allSignersDone) {
            version.status = 'signed';
            document.status = 'signed';
            document.markModified('versions');
        }

        await document.save();

        return NextResponse.json({ success: true, message: 'Document signed' });
    } catch {
        return NextResponse.json({ message: 'Failed to sign document' }, { status: 500 });
    }
}
