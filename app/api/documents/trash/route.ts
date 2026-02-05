import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import connectDB from '@/utils/db';

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
