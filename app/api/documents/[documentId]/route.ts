import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { getObjectStream } from '@/lib/s3';

export const runtime = 'nodejs';

/* =========================================================
   GET — STREAM DOCUMENT (OWNER OR RECIPIENT VIA TOKEN)
========================================================= */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await props.params;
    const sessionUserId = await getAuthSession(req);
    const token = req.nextUrl.searchParams.get('token');

    const doc = await DocumentModel.findById(documentId);
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    let targetVersion: any;
    let authorized = false;

    /* ===============================
       OWNER ACCESS (SESSION)
    =============================== */
    if (sessionUserId && doc.userId.toString() === sessionUserId) {
      authorized = true;

      // Owner sees latest locked version
      targetVersion = doc.versions
        .filter((v: { locked: any; }) => v.locked)
        .sort((a: { version: number; }, b: { version: number; }) => b.version - a.version)[0];
    }

    /* ===============================
       RECIPIENT ACCESS (TOKEN)
    =============================== */
    if (!authorized && token) {
      const recipient = doc.recipients.find((r: { signingToken: string; }) => r.signingToken === token);

      if (!recipient) {
        return NextResponse.json(
          { message: 'Invalid signing link' },
          { status: 401 }
        );
      }

      // Token expiry
      if (recipient.expiresAt && new Date() > recipient.expiresAt) {
        recipient.status = 'expired';
        await doc.save();
        return NextResponse.json(
          { message: 'Signing link expired' },
          { status: 410 }
        );
      }

      // Prevent reuse
      if (
        recipient.status !== 'pending' &&
        recipient.status !== 'viewed' &&
        recipient.status !== 'sent' &&
        recipient.status !== 'signed'
      ) {
        return NextResponse.json(
          { message: 'Signing link already used' },
          { status: 401 }
        );
      }

      // Sequential signing enforcement
      if (doc.signingMode === 'sequential') {
        if (
          !doc.signingState ||
          recipient.order !== doc.signingState.currentOrder
        ) {
          return NextResponse.json(
            { message: 'Signing not allowed yet' },
            { status: 403 }
          );
        }
      }

      // Mark as viewed (audit-safe)
      if (!recipient.viewedAt) {
        recipient.viewedAt = new Date();
        recipient.status = 'viewed';
        await doc.save();
      }

      authorized = true;

      // Version selection
      if (doc.signingMode === 'parallel') {
        // Prepared (editable) version
        targetVersion = doc.versions.find((v: { label: string; }) => v.label === 'prepared');
      } else {
        // Latest locked version
        targetVersion = doc.versions
          .filter((v: { locked: any; }) => v.locked)
          .sort((a: { version: number; }, b: { version: number; }) => b.version - a.version)[0];
      }
    }

    if (!authorized || !targetVersion?.storage?.bucket || !targetVersion?.storage?.key) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /* ===============================
       STREAM FILE
    =============================== */
    const stream = await getObjectStream({
      bucket: targetVersion.storage.bucket,
      key: targetVersion.storage.key
    });

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': targetVersion.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.documentName}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('GET Document Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE — SOFT DELETE (OWNER ONLY)
========================================================= */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await props.params;
    const sessionUserId = await getAuthSession(req);

    if (!sessionUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const doc = await DocumentModel.findOne({
      _id: documentId,
      userId: sessionUserId,
      deletedAt: null
    });

    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Prevent deletion of completed documents
    if (doc.status === 'completed' || doc.status === 'final') {
      return NextResponse.json(
        { message: 'Completed documents cannot be deleted' },
        { status: 403 }
      );
    }

    // Soft delete
    doc.deletedAt = new Date();
    doc.status = 'trashed';
    await doc.save();

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('DELETE Document Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
