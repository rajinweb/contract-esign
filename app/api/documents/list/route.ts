import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { unauthorizedResponse } from '@/lib/auth';
import DocumentModel from '@/models/Document';
import { IDocumentVersion } from '@/types/types';
import { getUpdatedDocumentStatus, updateDocumentStatus } from '@/lib/statusLogic';
import { hasCompletionEvidence } from '@/lib/document-guards';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return unauthorizedResponse();
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
