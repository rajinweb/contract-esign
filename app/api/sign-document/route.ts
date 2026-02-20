import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';
import type { IDocumentRecipient } from '@/models/Document';
import type { DocumentField, FieldOwner } from '@/types/types';
import { updateDocumentStatus } from '@/lib/statusLogic';
import { mergeFieldsIntoPdfServer } from '@/lib/pdf';
import { getObjectStream, putObjectStream, getRegion } from '@/lib/s3';
import { sha256Buffer } from '@/lib/hash';
import { buildEventClient, buildEventConsent, buildEventGeo, buildSignedBySnapshot, getLatestPreparedVersion, getLatestSignedVersion, getNextSequentialOrder, isRecipientTurn, normalizeIp } from '@/lib/signing-utils';
import { sanitizeRecipient, sanitizeRecipients } from '@/lib/recipient-sanitizer';
import { sendSigningRequestEmail } from '@/lib/email';
import { buildSignedFieldRecords, deleteSignedFieldRecords, upsertSignedFieldRecords } from '@/lib/signed-fields';
import SignatureModel from '@/models/Signature';
import { normalizeFieldOwner, normalizeFields } from '@/lib/field-normalization';

type LooseField = Partial<DocumentField> & {
    id?: string;
    fieldId?: string;
    recipientId?: string | null;
    value?: unknown;
    fieldOwner?: FieldOwner | string;
};

type SignatureRecord = {
    fieldId?: string;
    version?: number;
    signedAt?: Date | string;
    fieldValue?: string;
};

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { token, fields, location, device, consent } = await req.json();

        if (!token)
            return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });

        // 🔑 Find document by token (bulletproof)
        const document = await DocumentModel.findOne({
            recipients: { $elemMatch: { signingToken: token } }
        });
        if (!document)
            return NextResponse.json({ success: false, message: 'Invalid or expired signing link' }, { status: 404 });
        if (document.deletedAt) {
            return NextResponse.json({ success: false, message: 'Document has been trashed.' }, { status: 410 });
        }
        if (document.status === 'completed' || document.status === 'voided' || document.status === 'rejected') {
            const message =
                document.status === 'rejected'
                    ? 'This signing request was rejected.'
                    : 'Document is not available for signing.';
            return NextResponse.json({ success: false, message }, { status: 409 });
        }

        const recipient = document.recipients.find((r: { signingToken: string; }) => r.signingToken === token);
        if (!recipient)
            return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });

        // ⚠️ SEQUENTIAL SIGNING: Only allow signing if it's this recipient's turn
        if (document.signingMode === 'sequential') {
            if (!isRecipientTurn(recipient, document.recipients)) {
                return NextResponse.json({ success: false, message: 'Not your turn to sign' }, { status: 403 });
            }
        }

        const preparedVersion = getLatestPreparedVersion(document.versions || []);
        if (!preparedVersion) return NextResponse.json({ success: false, message: 'Prepared version not found' }, { status: 404 });
        const latestSignedVersion = getLatestSignedVersion(document.versions || []);

        // Check expiry
        if (preparedVersion.expiresAt && new Date() > new Date(preparedVersion.expiresAt))
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });

        // ✅ Idempotency: skip if already signed/approved
        if (['signed', 'approved'].includes(recipient.status))
            return NextResponse.json({ success: true, message: 'Document already signed' });

        // ⚠️ GENERATE NEW SIGNED PDF (IMMUTABILITY RULE)
        const baseVersionSource = latestSignedVersion ?? preparedVersion;
        const baseVersionNumber = baseVersionSource.version;
        if (document.currentVersion !== baseVersionNumber) {
            return NextResponse.json({ success: false, message: 'Signing base version is stale. Please refresh.' }, { status: 409 });
        }
        const newVersionNumber = (document.currentVersion ?? baseVersionNumber) + 1;
        const recipientsAfterSign = document.recipients.map((r: IDocumentRecipient) =>
          r.id === recipient.id ? { ...r, status: 'signed' } : r
        );
        const allRecipientsSigned = recipientsAfterSign.every((r: IDocumentRecipient) => r.status === 'signed');
        const newVersionLabel = allRecipientsSigned ? 'signed_final' : `signed_by_order_${recipient.order}`;
        const signedAt = new Date();
        const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));
        const userAgent = req.headers.get('user-agent') ?? undefined;
        const signedRecipientIds = new Set(
            document.recipients
                .filter((r: IDocumentRecipient) => r?.status === 'signed' || r?.status === 'approved')
                .map((r: IDocumentRecipient) => r.id)
        );
        const hasForbiddenForeignValues = (fields || []).some((field: LooseField) => {
            const owner = normalizeFieldOwner(field);
            if (owner === 'me') return false;
            const value = field?.value;
            const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
            if (!hasValue) return false;
            if (field?.recipientId === recipient.id) return false;
            // Allow previously signed recipients' values to remain visible
            return !signedRecipientIds.has(field?.recipientId);
        });
        if (hasForbiddenForeignValues) {
            return NextResponse.json({ success: false, message: 'Fields include values for other recipients.' }, { status: 400 });
        }
        const preparedFields = normalizeFields(Array.isArray(preparedVersion?.fields) ? preparedVersion.fields : []);
        const incomingValueMap = new Map<string, unknown>();
        (fields || []).forEach((field: LooseField) => {
            const fieldId = String(field?.id ?? field?.fieldId ?? '');
            if (!fieldId) return;
            incomingValueMap.set(fieldId, field?.value);
        });
        const recipientFields = preparedFields
            .filter((field) => {
                const owner = normalizeFieldOwner(field);
                if (owner === 'me') return false;
                return field?.recipientId === recipient.id;
            })
            .map((field) => {
                const fieldId = String(field?.id ?? field?.fieldId ?? '');
                const incomingValue = fieldId ? incomingValueMap.get(fieldId) : undefined;
                return {
                    ...field,
                    value: incomingValue ?? field?.value ?? '',
                };
            });
        const ownerPrefilledFields = preparedFields
            .filter((field) => normalizeFieldOwner(field) === 'me')
            .filter((field) => {
                const value = field?.value;
                return value !== undefined && value !== null && String(value).trim() !== '';
            });
        const fieldsToRenderOnPdf = [...ownerPrefilledFields, ...recipientFields];
        const eventFields = await Promise.all(
            recipientFields.map(async (field) => ({
                fieldId: String(field.id),
                fieldHash: await sha256Buffer(Buffer.from(`${String(field.id)}:${field.value ?? ''}`)),
            }))
        );
        const fieldsHash = await sha256Buffer(Buffer.from(JSON.stringify(eventFields)));

        try {
            // 1️⃣ Load base PDF from S3
            const bucket = process.env.S3_BUCKET_NAME;
            if (!bucket) throw new Error('S3_BUCKET_NAME not configured');

            const storage = baseVersionSource.storage;
            if (!storage?.key || !storage?.region) {
                return NextResponse.json({ success: false, message: 'Signed base PDF is missing storage metadata.' }, { status: 500 });
            }
            const basePdfStream = await getObjectStream({
                bucket,
                key: storage.key,
                region: storage.region
            });

            // 2️⃣ Merge fields into PDF (server-side PDF generation)
            const mergedPdfBuffer = await mergeFieldsIntoPdfServer(basePdfStream, fieldsToRenderOnPdf);

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

            // 4️⃣ Persist signed field values (immutable snapshot)
            const { records: signedFieldRecords, fieldIds } = await buildSignedFieldRecords({
                documentId: document._id,
                version: newVersionNumber,
                recipientId: recipient.id,
                fields: recipientFields,
                eventFields,
                signedAt,
                ip,
                ipUnavailableReason,
                userAgent,
            });
            await upsertSignedFieldRecords(signedFieldRecords);

            // 5️⃣ Update recipient status + capture metadata
            recipient.status = 'signed';
            recipient.signedAt = signedAt;
            recipient.signedVersion = newVersionNumber;
            if (location) recipient.location = location;
            if (device) recipient.device = device;
            if (consent) recipient.consent = consent;
            recipient.network = { ip, ipUnavailableReason };

            const signedBySnapshot = buildSignedBySnapshot(document.recipients, newVersionNumber);

            // 6️⃣ Create new immutable version object
            const newVersion = {
                version: newVersionNumber,
                label: newVersionLabel,
                derivedFromVersion: baseVersionNumber,
                signedBy: signedBySnapshot,
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
                documentName: preparedVersion.documentName || document.documentName,
                status: 'final',
                changeLog: `Signed by ${recipient.name} (order: ${recipient.order})`,
                changeMeta: {
                    action: 'signed',
                    actorId: recipient.id,
                    actorRole: recipient.role,
                    signingMode: document.signingMode,
                    baseVersion: baseVersionNumber,
                    derivedFromVersion: baseVersionNumber,
                    signedAt,
                    source: 'server',
                },
                renderedBy: 'server',
                pdfSignedAt: signedAt,
                editHistory: [],
                createdAt: signedAt,
                updatedAt: signedAt
            };

            // 7️⃣ Push new version and update currentVersion
            document.versions.push(newVersion);
            document.currentVersion = newVersionNumber;

            // 8️⃣ Record signing event with CORRECT version
            document.signingEvents ??= [];
            document.signingEvents.push({
                recipientId: recipient.id,
                action: 'signed',
                fields: eventFields,
                fieldsHash,
                fieldsHashAlgo: 'SHA-256',
                signedAt,
                serverTimestamp: signedAt,
                baseVersion: baseVersionNumber,
                version: newVersionNumber,
                order: recipient.order,
                ip,
                ipUnavailableReason,
                userAgent,
                client: buildEventClient({ ip, userAgent, recipient }),
                geo: buildEventGeo(recipient),
                consent: buildEventConsent(recipient),
            });

            // 9️⃣ Update document status
            updateDocumentStatus(document);
            if (document.status === 'completed') {
                document.completedAt ??= signedAt;
                document.finalizedAt ??= signedAt;
            }

            // 🔟 Sequential signing: advance to next order only if using sequential mode
            if (document.signingMode === 'sequential') {
                    const nextOrder = getNextSequentialOrder(document.recipients);
                    if (nextOrder !== null) {
                        const nextRecipients = document.recipients.filter(
                        (r: IDocumentRecipient) => r.role !== 'viewer' && r.order === nextOrder && r.status === 'pending'
                    );
                    nextRecipients.forEach((r: IDocumentRecipient) => {
                        r.status = 'sent';
                    });
                    for (const nextRec of nextRecipients) {
                        try {
                            await sendSigningRequestEmail(
                                nextRec,
                                document as unknown as Parameters<typeof sendSigningRequestEmail>[1],
                                undefined,
                                nextRec.signingToken
                            );
                        } catch (err) {
                            console.error('Email failed:', err);
                        }
                    }
                    for (const nextRec of nextRecipients) {
                        document.signingEvents.push({
                            recipientId: nextRec.id,
                            action: 'sent',
                            sentAt: signedAt,
                            serverTimestamp: signedAt,
                            baseVersion: newVersionNumber,
                            targetVersion: newVersionNumber + 1,
                            order: nextRec.order,
                            ip,
                            ipUnavailableReason,
                            userAgent,
                        });
                    }
                }
            }

            // 🔟 Save everything to database (rollback signed field snapshot on failure)
            try {
                await document.save();
            } catch (err) {
                await deleteSignedFieldRecords({
                    documentId: document._id,
                    version: newVersionNumber,
                    recipientId: recipient.id,
                    fieldIds,
                });
                throw err;
            }

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
        if (document.deletedAt) {
            return NextResponse.json({ success: false, message: 'Document has been trashed.' }, { status: 410 });
        }
        if (document.status === 'voided') {
            return NextResponse.json({ success: false, message: 'Document has been voided.' }, { status: 409 });
        }

        const preparedVersion = getLatestPreparedVersion(document.versions || []);
        if (!preparedVersion) return NextResponse.json({ success: false, message: 'Prepared version not found' }, { status: 404 });

        // verify expiry
        if (preparedVersion.expiresAt && new Date() > new Date(preparedVersion.expiresAt)) {
            return NextResponse.json({ success: false, message: 'Signing link has expired' }, { status: 410 });
        }
        const recipient = document.recipients.find((r: { signingToken: string; }) => r.signingToken === token);
        if (!recipient) return NextResponse.json({ success: false, message: 'Recipient not found' }, { status: 404 });
        if (document.status === 'rejected' && recipient.status !== 'rejected') {
            return NextResponse.json({ success: false, message: 'This signing request was rejected.' }, { status: 409 });
        }

        //  console.log('Returning recipients to client:', JSON.stringify(document.recipients, null, 2));

        let fields = normalizeFields(Array.isArray(preparedVersion?.fields) ? preparedVersion.fields : []);

        // No per-field privacy enforcement (feature removed)

        const signedRecipientIds = document.recipients
            .filter((r: IDocumentRecipient) => r?.status === 'signed' || r?.status === 'approved')
            .map((r: IDocumentRecipient) => r.id)
            .filter(Boolean);
        const allowedRecipientIds =
            signedRecipientIds.length > 0 ? signedRecipientIds : (recipient?.id ? [recipient.id] : []);

        if (allowedRecipientIds.length > 0) {
            const signedFieldRecords = await SignatureModel.find({
                documentId: document._id,
                recipientId: { $in: allowedRecipientIds },
            }).lean();

            if (signedFieldRecords.length > 0) {
                const fieldValueMap = new Map<string, { value: string; version: number; signedAt: number }>();
                for (const record of signedFieldRecords) {
                    const typedRecord = record as SignatureRecord;
                    const fieldId = String(typedRecord.fieldId ?? '');
                    if (!fieldId) continue;
                    const version = typeof typedRecord.version === 'number' ? typedRecord.version : -1;
                    const signedAt = typedRecord.signedAt ? new Date(typedRecord.signedAt).getTime() : 0;
                    const existing = fieldValueMap.get(fieldId);
                    if (!existing || version > existing.version || (version === existing.version && signedAt > existing.signedAt)) {
                        fieldValueMap.set(fieldId, {
                            value: String(typedRecord.fieldValue ?? ''),
                            version,
                            signedAt,
                        });
                    }
                }

                if (fieldValueMap.size > 0) {
                    fields = fields.map((field: LooseField) => {
                        const fieldId = String(field?.id ?? '');
                        if (!fieldId) return field;
                        const signedValue = fieldValueMap.get(fieldId);
                        if (!signedValue) return field;
                        return { ...field, value: signedValue.value };
                    });
                }
            }
        }

        const safeRecipients = sanitizeRecipients(document.recipients || []);
        const safeCurrentRecipient = sanitizeRecipient(recipient);

        return NextResponse.json({
            success: true,
            document: {
                id: document._id.toString(),
                name: document?.documentName || 'Untitled Document',
                fileUrl: `/api/documents/${document._id}?token=${token}`,
                fields,
                recipients: safeRecipients,
                currentRecipientId: recipient.id,
                currentRecipient: safeCurrentRecipient,
                status: document.status,
                signingMode: document.signingMode,
            },
        });
    } catch (_err) {
        console.error('Error in sign-document:', _err);
        return NextResponse.json({ success: false, message: 'Failed to load document' }, { status: 500 });
    }
}
