import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import AuditLogModel from '@/models/AuditLog';
import { normalizeIp } from '@/lib/signing-utils';

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

    const document = await DocumentModel.findOne({ _id: documentId, userId });
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    if (document.status === 'completed') {
      return NextResponse.json({ message: 'Completed documents are immutable.' }, { status: 409 });
    }

    if (document.status === 'voided') {
      return NextResponse.json({ success: true, status: 'voided', documentId: document._id });
    }

    const actionAt = new Date();
    const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));
    const userAgent = req.headers.get('user-agent') ?? undefined;

    document.status = 'voided';
    document.signingEvents ??= [];
    document.signingEvents.push({
      recipientId: String(userId),
      action: 'voided',
      serverTimestamp: actionAt,
      ip,
      ipUnavailableReason,
      userAgent,
    });

    await document.save();

    await AuditLogModel.create({
      documentId: document._id,
      actor: userId,
      action: 'document_voided',
      metadata: { ip, ipUnavailableReason },
    });

    return NextResponse.json({ success: true, status: 'voided', documentId: document._id });
  } catch (error) {
    console.error('Error voiding document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
