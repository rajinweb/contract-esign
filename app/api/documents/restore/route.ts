import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { message: 'Document IDs are required' },
        { status: 400 }
      );
    }

    const restoredAt = new Date();
    // Restore any soft-deleted documents; prefer statusBeforeDelete if present
    const result = await DocumentModel.updateMany(
      {
        _id: { $in: documentIds },
        userId,
        deletedAt: { $ne: null },
      },
      [
        {
          $set: {
            deletedAt: null,
            updatedAt: restoredAt,
            status: {
              $cond: [
                { $ne: [{ $ifNull: ['$statusBeforeDelete', null] }, null] },
                '$statusBeforeDelete',
                {
                  $cond: [
                    { $and: [{ $eq: ['$status', 'trashed'] }, { $ne: ['$completedAt', null] }] },
                    'completed',
                    '$status',
                  ],
                },
              ],
            },
          },
        },
        {
          $unset: ['statusBeforeDelete'],
        },
      ]
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: 'No matching documents found to restore' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: `Successfully restored ${result.modifiedCount} document(s)`,
    });
  } catch (error) {
    console.error('Error bulk restoring documents:', error);
    return NextResponse.json(
      { message: 'Error bulk restoring documents' },
      { status: 500 }
    );
  }
}
