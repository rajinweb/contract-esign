import { Readable, PassThrough } from 'stream';
import mongoose from 'mongoose';
import DocumentModel from '@/models/Document';
import { putObjectStream, getObjectStream, getRegion } from '@/lib/s3';
import { createSha256Transform, sha256Buffer } from '@/lib/hash';

export type StoreTarget = 's3' | 'db';
export type VersionLabel = 'original' | 'prepared' | 'signed';

function streamFromBuffer(buf: Buffer): Readable {
  const r = new Readable();
  r.push(buf);
  r.push(null);
  return r;
}

export async function addVersionFromBuffer(args: {
  documentId: string;
  userId: string;
  label: VersionLabel;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  store: StoreTarget;
  s3?: { bucket: string; key: string; };
  lock?: boolean;
  changeLog: string;
}) {
  const { documentId, userId, label, buffer, mimeType, fileName, store, s3: s3cfg, lock = false, changeLog } = args;

  // Compute hash BEFORE any upload to ensure the bytes we commit are the ones we store
  const hash = await sha256Buffer(buffer);
  const size = buffer.length;

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.userId !== userId) throw new Error('Unauthorized');

  const newVersionNumber = (doc.currentVersion ?? 0) + 1;

  let storage: any = null;

  if (store === 's3') {
    if (!s3cfg) throw new Error('s3 config required');
    await putObjectStream({ bucket: s3cfg.bucket, key: s3cfg.key, body: buffer, contentType: mimeType, contentLength: size });
    storage = { provider: 's3', bucket: s3cfg.bucket, key: s3cfg.key, region: getRegion(), url: `s3://${s3cfg.bucket}/${s3cfg.key}` };
  } else if (store === 'db') {
    throw new Error("Database storage ('db') is no longer supported.");
  }

  if (!storage) {
    throw new Error('A storage method must be specified and configured.');
  }

  const newVersion = {
    version: newVersionNumber,
    derivedFromVersion: doc.currentVersion,
    label,
    storage: storage,
    hash,
    hashAlgo: 'SHA-256',
    size,
    mimeType,
    locked: lock,
    sharedBinary: false,
    fields: [],
    documentName: fileName,
    status: label === 'signed' ? 'final' : 'draft',
    changeLog,
    editHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await DocumentModel.updateOne({ _id: documentId }, { $push: { versions: newVersion }, $set: { currentVersion: newVersionNumber } });

  return { version: newVersionNumber, hash, size, mimeType, locked: lock, storage, storedIn: store };
}

export async function addVersionFromStream(args: {
  documentId: string;
  userId: string;
  label: VersionLabel;
  stream: Readable;
  mimeType: string;
  fileName: string;
  store: StoreTarget;
  s3?: { bucket: string; key: string; };
  lock?: boolean;
  changeLog: string;
}) {
  const { documentId, userId, label, stream, mimeType, fileName, store, s3: s3cfg, lock = false, changeLog } = args;

  if (store === 'db') {
    throw new Error("Database storage ('db') is no longer supported for streams.");
  }
  if (store !== 's3' || !s3cfg) {
    throw new Error('s3 config required for stream storage');
  }

  // Hash while streaming and forward to destination
  const { transform, digestPromise } = createSha256Transform();

  let size = 0;
  const sizeCounter = new PassThrough();
  sizeCounter.on('data', (chunk) => { size += (chunk as Buffer).length; });

  const tee = stream.pipe(transform).pipe(sizeCounter);

  await putObjectStream({ bucket: s3cfg.bucket, key: s3cfg.key, body: tee, contentType: mimeType, contentLength: size });

  const hash = await digestPromise;

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.userId !== userId) throw new Error('Unauthorized');

  const newVersionNumber = (doc.currentVersion ?? 0) + 1;

  const storage = { provider: 's3', bucket: s3cfg.bucket, key: s3cfg.key, region: getRegion(), url: `s3://${s3cfg.bucket}/${s3cfg.key}` };

  const newVersion = {
    version: newVersionNumber,
    derivedFromVersion: doc.currentVersion,
    label,
    storage,
    hash,
    hashAlgo: 'SHA-256',
    size,
    mimeType,
    locked: lock,
    sharedBinary: false,
    fields: [],
    documentName: fileName,
    status: label === 'signed' ? 'final' : 'draft',
    changeLog,
    editHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await DocumentModel.updateOne({ _id: documentId }, { $push: { versions: newVersion }, $set: { currentVersion: newVersionNumber } });

  return { version: newVersionNumber, hash, size, mimeType, locked: lock, storage, storedIn: store };
}

export async function getVersionStream(documentId: string, version: number): Promise<{ stream: Readable; mimeType: string; }> {
  const doc = await DocumentModel.findById(documentId).select('+versions.filePath');
  if (!doc) throw new Error('Document not found');
  const v = doc.versions.find((x: any) => x.version === version);
  if (!v) throw new Error('Version not found');
  if (v.storage && v.storage.provider === 's3' && v.storage.bucket && v.storage.key) {
    const stream = await getObjectStream({ bucket: v.storage.bucket, key: v.storage.key, region: v.storage.region });
    return { stream, mimeType: v.mimeType };
  }
  throw new Error('No S3 storage found for this version');
}

export async function verifyVersionIntegrity(documentId: string, version: number): Promise<{ ok: boolean; expected: string; actual: string; }> {
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error('Document not found');
  const v = doc.versions.find((x: any) => x.version === version);
  if (!v) throw new Error('Version not found');

  let actual: string;
  if (v.storage && v.storage.provider === 's3' && v.storage.bucket && v.storage.key) {
    const s = await getObjectStream({ bucket: v.storage.bucket, key: v.storage.key, region: v.storage.region });
    const { transform, digestPromise } = createSha256Transform();
    await new Promise<void>((resolve, reject) => {
      s.pipe(transform).on('finish', resolve).on('error', reject);
    });
    actual = await digestPromise;
  } else {
    throw new Error('No S3 storage found for version');
  }

  const expected = v.hash;
  return { ok: expected === actual, expected, actual };
}