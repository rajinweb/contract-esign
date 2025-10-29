import { NextRequest, NextResponse } from 'next/server';
import Document from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import { Recipient } from '@/types/types';

export const POST = async (
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) => {
  const { documentId } = await context.params; // must await since params is a Promise in Next 15

  try {
    const doc = await Document.findById(documentId);

    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    let wasReset = false;
    doc.recipients.forEach((recipient: Recipient) => {
      if (recipient.status === 'rejected') {
        recipient.status = 'sent';
        recipient.rejectedAt = undefined;
        wasReset = true;
      }
    });

    if (!wasReset) {
      return NextResponse.json(
        { success: true, message: 'No recipients needed resetting.', document: doc },
        { status: 200 }
      );
    }

    const newStatus = getUpdatedDocumentStatus(doc.toObject());
    doc.status = newStatus;

    const updatedDoc = await doc.save();

    return NextResponse.json({ success: true, document: updatedDoc }, { status: 200 });
  } catch (error) {
    console.error('Error resetting document:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
};
