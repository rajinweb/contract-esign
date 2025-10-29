import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel, { IDocumentVersion } from '@/models/Document';
import { updateDocumentStatus } from '@/lib/statusLogic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const documents = await DocumentModel.find(query)
      .select('-versions.pdfData') // Exclude PDF data for list view
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await DocumentModel.countDocuments(query);

    // Update document statuses before sending them
    for (const doc of documents) {
      updateDocumentStatus(doc);
    }

    const documentsWithMetadata = documents.map(doc => ({
      id: doc._id,
      userId: doc.userId,
      name: doc.documentName,
      originalFileName: doc.originalFileName,
      currentVersion: doc.currentVersion,
      totalVersions: doc.versions.length,
      status: doc.status,
      recipients: doc.recipients,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastSentAt: doc.versions.find((v: IDocumentVersion) => !!v.sentAt)?.sentAt,
      expiresAt: doc.versions.find((v: IDocumentVersion) => v.version === doc.currentVersion)?.expiresAt,
    }));

    return NextResponse.json({
      success: true,
      documents: documentsWithMetadata,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('API Error in GET /api/documents/list', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
