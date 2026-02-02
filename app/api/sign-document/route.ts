import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel, { IDocumentRecipient } from '@/models/Document';
import { IDocumentVersion } from '@/types/types';
import { updateDocumentStatus } from '@/lib/statusLogic';
import { mergeFieldsIntoPdfServer } from '@/lib/pdf';
import { getObjectStream, putObjectStream, getRegion } from '@/lib/s3';
import { sha256Buffer } from '@/lib/hash';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { token, fields } = await req.json();

        if (!token)
            return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });

        // 🔑 Find document by token (bulletproof)
        const document = await DocumentModel.findOne({
            recipients: { $elemMatch: { signingToken: token } }
        });
        if (!document)
            return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });

        const recipient = document.recipients.find((r: { signingToken: any; }) => r.signingToken === token);
        if (!recipient)
            return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });

        // ⚠️ SEQUENTIAL SIGNING: Only allow signing if it's this recipient's turn
        if (document.signingMode === 'sequential') {
            if (!document.signingState?.currentOrder || recipient.order !== document.signingState.currentOrder) {
                return NextResponse.json({ success: false, message: 'Not your turn to sign' }, { status: 403 });
            }
        }

        const baseVersion = document.versions.find((v: { version: any; }) => v.version === document.currentVersion);
        if (!baseVersion) return NextResponse.json({ success: false, message: 'Base version not found' }, { status: 404 });

        // Check expiry
        if (baseVersion.expiresAt && new Date() > new Date(baseVersion.expiresAt))
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });

        // ✅ Idempotency: skip if already signed/approved
        if (['signed', 'approved'].includes(recipient.status))
            return NextResponse.json({ success: true, message: 'Document already signed' });

        // ⚠️ GENERATE NEW SIGNED PDF (IMMUTABILITY RULE)
        const baseVersionNumber = document.currentVersion;
        const newVersionNumber = baseVersionNumber + 1;
        const isLastSigner = document.recipients
          .filter((r: any) => r.role !== 'viewer' && r.id !== recipient.id)
          .every((r: any) => ['signed', 'approved'].includes(r.status));

        const newVersionLabel = isLastSigner ? 'signed_final' : `signed_by_order_${recipient.order}`;

        try {
            // 1️⃣ Load base PDF from S3
            const bucket = process.env.S3_BUCKET_NAME;
            if (!bucket) throw new Error('S3_BUCKET_NAME not configured');

            const basePdfStream = await getObjectStream({
                bucket,
                key: baseVersion.storage.key,
                region: baseVersion.storage.region
            });

            // 2️⃣ Merge fields into PDF (server-side PDF generation)
            const mergedPdfBuffer = await mergeFieldsIntoPdfServer(basePdfStream, fields || []);

            // 3️⃣ Upload signed PDF to S3
            const signedPdfKey = `documents/${document.userId}/${document._id}/signed_${newVersionNumber}_${recipient.id}.pdf`;
            const signedPdfHash = await sha256Buffer(mergedPdfBuffer);
            const signedPdfSize = mergedPdfBuffer.length;

            await putObjectStream({
                bucket,
                key: signedPdfKey,
                body: mergedPdfBuffer,
                contentType: 'application/pdf',
                contentLength: signedPdfSize
            });

            // 4️⃣ Create new immutable version object
            const newVersion = {
                version: newVersionNumber,
                label: newVersionLabel,
                derivedFromVersion: baseVersionNumber,
                storage: {
                    provider: 's3',
                    bucket,
                    key: signedPdfKey,
                    region: getRegion(),
                    url: `s3://${bucket}/${signedPdfKey}`
                },
                hash: signedPdfHash,
                hashAlgo: 'SHA-256',
                size: signedPdfSize,
                mimeType: 'application/pdf',
                locked: true,
                fields: fields || [],
                documentName: baseVersion.documentName || document.documentName,
                status: 'final',
                changeLog: `Signed by ${recipient.name} (order: ${recipient.order})`,
                editHistory: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // 5️⃣ Update recipient with correct signedVersion
            recipient.status = 'signed';
            recipient.signedAt = new Date();
            recipient.signedVersion = newVersionNumber;
            recipient.fields = fields || [];

            // 6️⃣ Push new version and update currentVersion
            document.versions.push(newVersion);
            document.currentVersion = newVersionNumber;

            // 7️⃣ Record signing event with CORRECT version
            document.signingState ??= { signingEvents: [] };
            document.signingState.signingEvents.push({
                recipientId: recipient.id,
                fields,
                signedAt: new Date(),
                version: newVersionNumber,
                order: recipient.order,
                ip: req.headers.get('x-forwarded-for') ?? undefined,
                userAgent: req.headers.get('user-agent') ?? undefined,
            });

            // 8️⃣ Update document status
            updateDocumentStatus(document);

            // 9️⃣ Sequential signing: advance to next order only if using sequential mode
            if (document.signingMode === 'sequential') {
                const currentOrder = recipient.order;
                const allDoneAtThisOrder = document.recipients
                    .filter((r: any) => r.order === currentOrder && r.role !== 'viewer')
                    .every((r: any) => ['signed', 'approved'].includes(r.status));

                if (allDoneAtThisOrder) {
                    const nextOrder = Math.min(
                        ...document.recipients
                            .filter((r: any) => r.order > currentOrder && r.role !== 'viewer')
                            .map((r: any) => r.order)
                    );
                    if (Number.isFinite(nextOrder)) {
                        document.signingState.currentOrder = nextOrder;
                        // Mark next signers as 'sent' so they can sign
                        document.recipients.forEach((r: any) => {
                            if (r.order === nextOrder && r.status === 'pending') {
                                r.status = 'sent';
                            }
                        });
                    } else {
                        // No more signers - clear currentOrder
                        document.signingState.currentOrder = undefined;
                    }
                }
            }

            // 🔟 Save everything to database
            await document.save();

            return NextResponse.json({
                success: true,
                message: 'Document signed successfully',
                version: newVersionNumber,
                documentId: document._id
            });

        } catch (pdfErr) {
            console.error('Error generating signed PDF:', pdfErr);
            return NextResponse.json({
                success: false,
                message: 'Failed to generate signed PDF: ' + (pdfErr instanceof Error ? pdfErr.message : 'Unknown error')
            }, { status: 500 });
        }

    } catch (err) {
        console.error('Error in sign-document POST:', err);
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

        // Don't use .lean() to ensure we get fresh data from DB
        const document = await DocumentModel.findOne({ 'recipients.signingToken': token });
        if (!document) return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });

        const version = document.versions.find((v: IDocumentVersion) => v.version === document.currentVersion);
        if (!version) return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });

        // verify expiry
        if (version.expiresAt && new Date() > new Date(version.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }
        const recipient = document.recipients.find((r: { signingToken: string; }) => r.signingToken === token);
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
