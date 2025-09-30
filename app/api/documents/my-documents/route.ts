import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const query: any = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const documents = await DocumentModel.find(query)
      .select('-versions.pdfData') // Exclude PDF data for list view
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await DocumentModel.countDocuments(query);

    const documentsWithMetadata = documents.map(doc => ({
      id: doc._id,
      name: doc.documentName,
      originalFileName: doc.originalFileName,
      currentVersion: doc.currentVersion,
      totalVersions: doc.versions.length,
      status: doc.status,
      recipients: doc.recipients,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastSentAt: doc.versions.find(v => v.sentAt)?.sentAt,
      expiresAt: doc.versions.find(v => v.version === doc.currentVersion)?.expiresAt,
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
    console.error('Error fetching documents:', error);
    return NextResponse.json({ message: 'Failed to fetch documents' }, { status: 500 });
  }
}