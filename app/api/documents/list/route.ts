import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { IDocumentVersion } from '@/types/types';
import { getUpdatedDocumentStatus, updateDocumentStatus } from '@/lib/statusLogic';

function hasCompletionEvidence(doc: any): boolean {
  if (doc.status === 'completed') return true;
  if (doc.completedAt || doc.finalizedAt) return true;
  const versions = Array.isArray(doc.versions) ? doc.versions : [];
  if (versions.some((v: any) => v?.label === 'signed_final')) return true;
  const recipients = Array.isArray(doc.recipients) ? doc.recipients : [];
  const signers = recipients.filter((r: any) => r?.role === 'signer');
  if (signers.length > 0 && signers.every((r: any) => r?.status === 'signed' && typeof r?.signedVersion === 'number')) {
    return true;
  }
  const signingEvents = Array.isArray(doc.signingEvents) ? doc.signingEvents : [];
  if (signers.length > 0 && signingEvents.length > 0) {
    const signedSet = new Set(
      signingEvents
        .filter((e: any) => e?.action === 'signed' && e?.recipientId)
        .map((e: any) => String(e.recipientId))
    );
    const signerIds = signers.map((s: any) => String(s.id)).filter(Boolean);
    if (signerIds.length > 0 && signerIds.every((id: string) => signedSet.has(id))) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const status = searchParams.get('status');

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    const query: Record<string, unknown> = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    let mongooseQuery = DocumentModel.find(query)
      .select('-versions.pdfData')
      .sort({ updatedAt: -1 });

    if (limit !== null) {
      mongooseQuery = mongooseQuery
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const documents = await mongooseQuery;

    const total = await DocumentModel.countDocuments(query);

    // Update document statuses before sending them
    for (const doc of documents) {
      if (!doc.deletedAt && doc.status !== 'trashed') {
        updateDocumentStatus(doc);
      }
    }

    const documentsWithMetadata = documents.map(doc => {
      const effectiveStatus =
        doc.deletedAt
          ? (hasCompletionEvidence(doc)
            ? 'completed'
            : (doc.statusBeforeDelete ||
              (doc.status === 'trashed'
                ? getUpdatedDocumentStatus(doc.toObject())
                : doc.status)))
          : doc.status;
      return {
      id: doc._id,
      userId: doc.userId,
      name: doc.documentName,
      isTemplate: doc.isTemplate,
      originalFileName: doc.originalFileName,
      currentVersion: doc.currentVersion,
      totalVersions: doc.versions.length,
      status: effectiveStatus,
      recipients: doc.recipients,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastSentAt: doc.versions.find((v: IDocumentVersion) => !!v.sentAt)?.sentAt,
      expiresAt: doc.versions.find((v: IDocumentVersion) => v.version === doc.currentVersion)?.expiresAt,
      deletedAt: doc.deletedAt,
      statusBeforeDelete: doc.statusBeforeDelete
      };
    });

    return NextResponse.json({
      success: true,
      documents: documentsWithMetadata,
      pagination: limit
        ? {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
        : null,
    });
  } catch (error) {
    console.error('API Error in GET /api/documents/list', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
