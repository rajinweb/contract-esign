
import { NextRequest, NextResponse } from 'next/server';
import Document from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import dbConnect from '@/utils/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  await dbConnect();

  const { documentId } = params;

  try {
    const doc = await Document.findById(documentId);

    if (!doc) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    let wasReset = false;
    doc.recipients.forEach((recipient: any) => {
      if (recipient.status === 'rejected') {
        recipient.status = 'sent';
        recipient.rejectedAt = undefined;
        wasReset = true;
      }
    });

    if (!wasReset) {
      return NextResponse.json({ success: true, message: 'No recipients needed resetting.', document: doc }, { status: 200 });
    }

    // Recalculate the overall document status
    const newStatus = getUpdatedDocumentStatus(doc.toObject());
    doc.status = newStatus;

    const updatedDoc = await doc.save();

    return NextResponse.json({ success: true, document: updatedDoc }, { status: 200 });
  } catch (error) {
    console.error('Error resetting document:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
