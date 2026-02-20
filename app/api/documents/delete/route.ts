import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import AuditLogModel from '@/models/AuditLog';
import { getUpdatedDocumentStatus } from '@/lib/statusLogic';
import fs from 'fs';
import path from 'path';
import { deleteObject } from '@/lib/s3';
import { normalizeIp } from '@/lib/signing-utils';
import { hasCompletionEvidence } from '@/lib/document-guards';

type AuditLogEntry = {
  documentId: unknown;
  actor: string;
  action: string;
  metadata: Record<string, unknown>;
};

type DocumentSoftDeleteUpdate = {
  $set: Record<string, unknown>;
  $push?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await req.json();
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ message: 'No document IDs provided' }, { status: 400 });
    }

    const documents = await DocumentModel.find({ _id: { $in: documentIds }, userId });

    if (documents.length === 0) {
      // This isn't an error, it just means no documents matched for this user.
      return NextResponse.json({ message: 'No matching documents found to delete' }, { status: 200 });
    }

    // Soft delete is allowed for completed documents (move to trash).

    const deletedAt = new Date();
    const { ip, ipUnavailableReason } = normalizeIp(req.headers.get('x-forwarded-for'));
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const auditLogs: AuditLogEntry[] = [];

    // Soft delete: keep status unchanged, record statusBeforeDelete based on completion evidence.
    // If in_progress, void before trashing to stop the signing flow.
    const bulkOps = documents.map((doc) => {
      const computedStatus =
        doc.statusBeforeDelete ||
        (hasCompletionEvidence(doc) ? 'completed' : getUpdatedDocumentStatus(doc.toObject()));
      const shouldVoid = doc.status === 'in_progress';

      const update: DocumentSoftDeleteUpdate = {
        $set: {
          deletedAt,
          updatedAt: deletedAt,
          statusBeforeDelete: shouldVoid ? 'voided' : computedStatus,
        },
      };

      if (shouldVoid) {
        update.$set.status = 'voided';
        update.$push = {
          signingEvents: {
            recipientId: String(userId),
            action: 'voided',
            serverTimestamp: deletedAt,
            ip,
            ipUnavailableReason,
            userAgent,
          },
        };
        auditLogs.push({
          documentId: doc._id,
          actor: userId,
          action: 'document_voided',
          metadata: { ip, ipUnavailableReason, reason: 'trashed_in_progress' },
        });
      }

      return {
        updateOne: {
          filter: { _id: doc._id, userId },
          update,
        },
      };
    });
    if (bulkOps.length > 0) {
      await DocumentModel.bulkWrite(
        bulkOps as Parameters<typeof DocumentModel.bulkWrite>[0],
        { ordered: false }
      );
    }
    if (auditLogs.length > 0) {
      await AuditLogModel.insertMany(auditLogs, { ordered: false });
    }

    return NextResponse.json({ message: `Successfully moved ${documents.length} document(s) to trash` });
  } catch (error) {
    console.error('API Error in POST /api/documents/bulk-delete', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await req.json();
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ message: 'No document IDs provided' }, { status: 400 });
    }

    const documents = await DocumentModel.find({ _id: { $in: documentIds }, userId });

    if (documents.length === 0) {
      // This isn't an error, it just means no documents matched for this user.
      return NextResponse.json({ message: 'No matching documents found to delete' }, { status: 200 });
    }

    const completedDocs = documents.filter(doc =>
      doc.status === 'completed' ||
      doc.statusBeforeDelete === 'completed' ||
      hasCompletionEvidence(doc) ||
      getUpdatedDocumentStatus(doc.toObject()) === 'completed'
    );
    if (completedDocs.length > 0) {
      return NextResponse.json(
        { message: 'Completed documents are immutable and cannot be permanently deleted.' },
        { status: 409 }
      );
    }

    // Delete associated files from S3 and the filesystem
    for (const doc of documents) {
      if (doc.versions && doc.versions.length > 0) {
        for (const version of doc.versions) {
          // Delete from S3
          if (version.storage && version.storage.key && version.storage.bucket) {
            try {
              await deleteObject({
                bucket: version.storage.bucket,
                key: version.storage.key,
                region: version.storage.region,
              });
            } catch (err) {
              console.error(`Failed to delete S3 object ${version.storage.key}:`, err);
              // Continue to delete the DB record even if S3 deletion fails
            }
          }
          // Delete from local filesystem (legacy)
          if (version.filePath) {
            try {
              // Ensure the path is within the project's uploads directory
              const uploadsDir = path.join(process.cwd(), 'uploads');
              const absoluteFilePath = path.resolve(version.filePath);

              if (absoluteFilePath.startsWith(uploadsDir)) {
                if (fs.existsSync(absoluteFilePath)) {
                  fs.unlinkSync(absoluteFilePath);
                }
              } else {
                console.warn(`Attempted to delete a file outside of the uploads directory: ${version.filePath}`);
              }
            } catch (err) {
              console.error(`Failed to delete file ${version.filePath}:`, err);
              // Continue to delete the DB record even if file deletion fails
            }
          }
        }
      }
    }

    await DocumentModel.deleteMany({ _id: { $in: documentIds }, userId });

    return NextResponse.json({ message: 'Document(s) deleted successfully' });
  } catch (error) {
    console.error('API Error in POST /api/documents/bulk-delete', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
