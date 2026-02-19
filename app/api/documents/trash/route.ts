import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import connectDB from '@/utils/db';
import { hasCompletionEvidence } from '@/lib/document-guards';


export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const trashedDocuments = await DocumentModel
      .find({
        userId,
        deletedAt: { $ne: null },
      })
      .sort({ updatedAt: -1 }); // newest first

    const response = trashedDocuments.map((doc: any) => {
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
        ...doc.toObject(),
        status: effectiveStatus,
      };
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching trashed documents:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
