import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import DocumentModel from '@/models/Document';
import AuditLogModel from '@/models/AuditLog';
import SignatureModel from '@/models/Signature';
import fs from 'fs';
import path from 'path';
import { deleteObject } from '@/lib/s3';

export const runtime = 'nodejs';

const DEFAULT_DRY_RUN_LIMIT = 200;

type RetentionRequestBody = {
  documentIds?: string[];
  dryRun?: boolean;
  limit?: number;
  retentionBefore?: string;
  retentionYears?: number;
};

type PurgeDocumentProjection = {
  _id: unknown;
  versions?: Array<{
    storage?: { bucket?: string; key?: string; region?: string };
    filePath?: string;
  }>;
};

function getRetentionToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('x-retention-token');
  if (headerToken) return headerToken;
  const auth = req.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length);
  }
  return null;
}

function parseRetentionBefore(body: RetentionRequestBody): { date: Date | null; error?: string } {
  const retentionBefore = body?.retentionBefore;
  const retentionYears = body?.retentionYears;

  if (retentionBefore && retentionYears) {
    return { date: null, error: 'Provide either retentionBefore or retentionYears, not both' };
  }

  if (retentionBefore) {
    const parsed = new Date(retentionBefore);
    if (Number.isNaN(parsed.getTime())) {
      return { date: null, error: 'Invalid retentionBefore date' };
    }
    return { date: parsed };
  }

  if (retentionYears !== undefined) {
    const years = Number(retentionYears);
    if (!Number.isFinite(years) || years <= 0) {
      return { date: null, error: 'retentionYears must be a positive number' };
    }
    const now = new Date();
    const before = new Date(now);
    before.setFullYear(before.getFullYear() - Math.floor(years));
    return { date: before };
  }

  return { date: null };
}

function buildRetentionQuery(retentionBefore: Date) {
  const completionDateExpr = { $ifNull: ['$completedAt', '$finalizedAt'] };

  return {
    $or: [
      { status: 'completed' },
      { completedAt: { $ne: null } },
      { finalizedAt: { $ne: null } },
    ],
    $expr: {
      $and: [
        { $ne: [completionDateExpr, null] },
        { $lt: [completionDateExpr, retentionBefore] },
      ],
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.RETENTION_PURGE_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ message: 'Retention purge token not configured' }, { status: 500 });
    }

    const token = getRetentionToken(req);
    if (!token || token !== expectedToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = (await req.json().catch(() => ({}))) as RetentionRequestBody;
    const documentIds: string[] = Array.isArray(body?.documentIds) ? body.documentIds : [];
    const dryRun = Boolean(body?.dryRun);
    const dryRunLimit =
      typeof body?.limit === 'number' && Number.isFinite(body.limit)
        ? Math.max(1, Math.min(Math.floor(body.limit), 2000))
        : DEFAULT_DRY_RUN_LIMIT;

    if (documentIds.length > 0 && (body?.retentionBefore || body?.retentionYears)) {
      return NextResponse.json({ message: 'Choose either documentIds or retention criteria' }, { status: 400 });
    }

    let query: Record<string, unknown> = {};
    let mode: 'ids' | 'retention';
    let retentionBefore: Date | null = null;

    if (documentIds.length > 0) {
      mode = 'ids';
      query = { _id: { $in: documentIds } };
    } else {
      mode = 'retention';
      const parsed = parseRetentionBefore(body);
      if (parsed.error) {
        return NextResponse.json({ message: parsed.error }, { status: 400 });
      }
      if (!parsed.date) {
        return NextResponse.json({ message: 'retentionBefore or retentionYears is required' }, { status: 400 });
      }
      retentionBefore = parsed.date;
      query = buildRetentionQuery(retentionBefore);
    }

    const totalMatches = await DocumentModel.countDocuments(query);
    if (totalMatches === 0) {
      return NextResponse.json({ message: 'No matching documents found to purge', dryRun, mode }, { status: 200 });
    }

    if (dryRun) {
      const sample = await DocumentModel.find(query)
        .select({ _id: 1, status: 1, completedAt: 1, finalizedAt: 1, deletedAt: 1 })
        .sort({ completedAt: 1, finalizedAt: 1, _id: 1 })
        .limit(dryRunLimit)
        .lean();

      return NextResponse.json({
        message: 'Retention purge dry-run completed',
        dryRun: true,
        mode,
        retentionBefore: retentionBefore ? retentionBefore.toISOString() : undefined,
        totalMatches,
        sampleCount: sample.length,
        truncated: totalMatches > sample.length,
        sample,
      });
    }

    const documents = await DocumentModel.find(query)
      .select({ _id: 1, versions: 1 })
      .lean<PurgeDocumentProjection[]>();
    const purgeIds = documents.map((doc: PurgeDocumentProjection) => doc._id);

    // Delete associated files from S3 and filesystem
    for (const doc of documents) {
      if (doc.versions && doc.versions.length > 0) {
        for (const version of doc.versions) {
          if (version.storage && version.storage.key && version.storage.bucket) {
            try {
              await deleteObject({
                bucket: version.storage.bucket,
                key: version.storage.key,
                region: version.storage.region,
              });
            } catch (err) {
              console.error(`Failed to delete S3 object ${version.storage.key}:`, err);
            }
          }
          if (version.filePath) {
            try {
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
            }
          }
        }
      }
    }

    // Remove audit logs & field signatures
    await AuditLogModel.deleteMany({ documentId: { $in: purgeIds } });
    await SignatureModel.deleteMany({ documentId: { $in: purgeIds } });

    // Permanently delete the documents
    await DocumentModel.deleteMany({ _id: { $in: purgeIds } });

    return NextResponse.json({
      message: `Retention purge completed for ${documents.length} document(s)`,
      purgedIds: purgeIds.map((id: unknown) => String(id)),
      mode,
      retentionBefore: retentionBefore ? retentionBefore.toISOString() : undefined,
    });
  } catch (error) {
    console.error('Retention purge error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
