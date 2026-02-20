import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/utils/db';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel, { IDocumentRecipient, IVersionDoc } from '@/models/Document';
import AuditLogModel from '@/models/AuditLog';
import { getLatestPreparedVersion } from '@/lib/signing-utils';
import { copyObject, getRegion } from '@/lib/s3';

export const runtime = 'nodejs';

function buildDerivedRecipients(recipients: unknown[]) {
  return recipients.map((recipient) => {
    const source = recipient as IDocumentRecipient & { toObject?: () => IDocumentRecipient };
    const base = typeof source?.toObject === 'function' ? source.toObject() : { ...source };
    return {
      ...base,
      signingToken: crypto.randomBytes(32).toString('hex'),
      status: 'pending',
      signedAt: null,
      signedVersion: null,
      approvedAt: null,
      rejectedAt: null,
      viewedAt: null,
      network: undefined,
      location: undefined,
      device: undefined,
      consent: undefined,
    };
  });
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await connectDB();
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { documentId } = params;

    const sourceDocument = await DocumentModel.findOne({ _id: documentId, userId });
    if (!sourceDocument) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    if (!['completed', 'voided', 'rejected'].includes(sourceDocument.status)) {
      return NextResponse.json(
        { message: 'Only completed, voided, or rejected documents can be derived.' },
        { status: 409 }
      );
    }

    const latestPrepared = getLatestPreparedVersion(sourceDocument.versions || []);
    const fallbackOriginal = sourceDocument.versions.find((v: IVersionDoc) => v.label === 'original');
    const currentVersion = sourceDocument.versions.find(
      (v: IVersionDoc) => v.version === sourceDocument.currentVersion
    );
    const sourceVersion = latestPrepared || fallbackOriginal || currentVersion;

    if (!sourceVersion?.storage?.provider || sourceVersion.storage.provider !== 's3') {
      return NextResponse.json({ message: 'Source document storage provider is unsupported.' }, { status: 400 });
    }

    const bucket = sourceVersion.storage.bucket || process.env.S3_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ message: 'S3 bucket not configured.' }, { status: 500 });
    }

    const derivedRecipients = buildDerivedRecipients(sourceDocument.recipients || []);
    const newDocument = new DocumentModel({
      userId,
      documentName: sourceDocument.documentName,
      originalFileName: sourceDocument.originalFileName,
      currentVersion: 1,
      currentSessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      versions: [],
      recipients: derivedRecipients,
      signingMode: sourceDocument.signingMode || 'parallel',
      signingEvents: [],
      auditTrailVersion: 1,
      status: 'draft',
      derivedFromDocumentId: sourceDocument._id,
      derivedFromVersion: sourceVersion?.version ?? sourceDocument.currentVersion,
      updatedAt: new Date(),
      createdAt: new Date(),
    });

    const destinationKey = `documents/${userId}/${newDocument._id}/original.pdf`;
    await copyObject({
      sourceBucket: bucket,
      sourceKey: sourceVersion.storage.key,
      destinationBucket: bucket,
      destinationKey,
      region: sourceVersion.storage.region || getRegion(),
    });

    const originalVersion = {
      version: 0,
      label: 'original',
      storage: {
        provider: 's3',
        bucket,
        key: destinationKey,
        region: sourceVersion.storage.region || getRegion(),
        url: `s3://${bucket}/${destinationKey}`,
      },
      hash: sourceVersion.hash,
      hashAlgo: sourceVersion.hashAlgo || 'SHA-256',
      size: sourceVersion.size,
      mimeType: sourceVersion.mimeType,
      locked: true,
      status: 'locked',
      ingestionNote: `Derived from ${sourceDocument.status} document ${sourceDocument._id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const preparedKey = `documents/${userId}/${newDocument._id}/prepared_1.pdf`;
    await copyObject({
      sourceBucket: bucket,
      sourceKey: destinationKey,
      destinationBucket: bucket,
      destinationKey: preparedKey,
      region: sourceVersion.storage.region || getRegion(),
    });

    const preparedFields = Array.isArray(latestPrepared?.fields)
      ? latestPrepared.fields
      : Array.isArray(sourceVersion?.fields)
        ? sourceVersion.fields
        : [];
    const preparedVersion = {
      version: 1,
      label: 'prepared',
      derivedFromVersion: 0,
      storage: {
        provider: 's3',
        bucket,
        key: preparedKey,
        region: sourceVersion.storage.region || getRegion(),
        url: `s3://${bucket}/${preparedKey}`,
      },
      hash: sourceVersion.hash,
      hashAlgo: sourceVersion.hashAlgo || 'SHA-256',
      size: sourceVersion.size,
      mimeType: sourceVersion.mimeType,
      locked: false,
      fields: preparedFields,
      documentName: sourceDocument.documentName,
      status: 'draft',
      changeLog: 'Document prepared for signing',
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    newDocument.versions.push(originalVersion, preparedVersion);
    await newDocument.save();

    await AuditLogModel.create({
      documentId: newDocument._id,
      actor: userId,
      action: 'document_derived',
      metadata: {
        sourceDocumentId: sourceDocument._id,
        sourceVersion: sourceDocument.currentVersion,
      },
    });

    return NextResponse.json({
      success: true,
      documentId: newDocument._id,
      derivedFromDocumentId: sourceDocument._id,
      derivedFromVersion: sourceVersion?.version ?? sourceDocument.currentVersion,
      message: 'Derived document created',
    });
  } catch (error) {
    console.error('Error deriving document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
