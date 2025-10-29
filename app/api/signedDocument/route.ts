import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentVersion, IDocumentRecipient } from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';

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
            if (action !== 'signed' && action !== 'rejected') {
                return NextResponse.json({ message: `Signers must use action "signed" or "rejected"` }, { status: 400 });
            }
            recipient.status = action;
            if (action === 'signed') {
                recipient.signedAt = new Date();
            } else if (action === 'rejected') {
                recipient.rejectedAt = new Date();
            }
        }
        else if (recipient.role === 'approver') {
            if (action !== 'approved' && action !== 'rejected') {
                return NextResponse.json({ message: `Approvers must use action "approved" or "rejected"` }, { status: 400 });
            }
            recipient.status = action;
            if (action === 'approved') {
                recipient.approvedAt = new Date();
            } else if (action === 'rejected') {
                recipient.rejectedAt = new Date();
            }
        }
        else if (recipient.role === 'viewer') {
            return NextResponse.json({ message: 'Viewers cannot take any actions' }, { status: 400 });
        }

        // IMPORTANT: Mark recipients array as modified so Mongoose saves it
        document.markModified('recipients');

        // Update overall document status
        const newStatus = getUpdatedDocumentStatus(document.toObject());
        document.status = newStatus;
        
        // also update version status if completed
        if (newStatus === 'completed') {
            version.status = 'signed'; // or 'final'
            document.markModified('versions');
        }

        await document.save();

        return NextResponse.json({ success: true, message: 'Document status updated' });
    } catch {
        return NextResponse.json({ message: 'Failed to update document status' }, { status: 500 });
    }
}
