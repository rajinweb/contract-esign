import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import connectDB from '@/utils/db';


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
        status: 'trashed',
      })
      .sort({ updatedAt: -1 }); // newest first

    return NextResponse.json(trashedDocuments, { status: 200 });
  } catch (error) {
    console.error('Error fetching trashed documents:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
