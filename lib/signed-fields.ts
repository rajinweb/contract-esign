import SignatureModel from '@/models/Signature';
import { sha256Buffer } from '@/lib/hash';

const SIGNATURE_VALUE_TYPES = new Set(['signature', 'initials', 'stamp', 'image', 'live_photo']);

function normalizeFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type EventFieldHash = { fieldId: string; fieldHash: string };
type SignedFieldInput = {
  id?: string;
  fieldId?: string;
  type?: string;
  value?: unknown;
};

type SignedFieldRecord = {
  documentId: unknown;
  version: number;
  recipientId: string;
  fieldId: string;
  fieldType: string;
  fieldValue: string;
  fieldValueHash: string;
  fieldHash: string;
  payloadHash: string;
  signatureImageHash?: string;
  signedAt: Date;
  ip?: string;
  ipUnavailableReason?: string;
  userAgent: string;
};

export async function buildSignedFieldRecords(args: {
  documentId: unknown;
  version: number;
  recipientId: string;
  fields: SignedFieldInput[];
  eventFields?: EventFieldHash[];
  signedAt: Date;
  ip?: string;
  ipUnavailableReason?: string;
  userAgent?: string;
}) {
  const {
    documentId,
    version,
    recipientId,
    fields,
    eventFields,
    signedAt,
    ip,
    ipUnavailableReason,
    userAgent,
  } = args;

  const eventFieldMap = new Map<string, string>();
  (eventFields || []).forEach((eventField) => {
    if (eventField?.fieldId) {
      eventFieldMap.set(String(eventField.fieldId), eventField.fieldHash);
    }
  });

  const records = await Promise.all(
    (fields || []).map(async (field: SignedFieldInput) => {
      const fieldId = String(field?.id ?? field?.fieldId ?? '');
      if (!fieldId) return null;

      const fieldType = String(field?.type ?? 'unknown');
      const fieldValue = normalizeFieldValue(field?.value);
      const fieldValueHash = await sha256Buffer(Buffer.from(fieldValue));

      const fieldHash =
        eventFieldMap.get(fieldId) ||
        (await sha256Buffer(Buffer.from(`${fieldId}:${fieldValue}`)));

      const payloadHash = await sha256Buffer(
        Buffer.from(
          JSON.stringify({
            documentId: String(documentId),
            version,
            recipientId,
            fieldId,
            fieldValueHash,
          })
        )
      );

      return {
        documentId,
        version,
        recipientId,
        fieldId,
        fieldType,
        fieldValue,
        fieldValueHash,
        fieldHash,
        payloadHash,
        signatureImageHash: SIGNATURE_VALUE_TYPES.has(fieldType) ? fieldValueHash : undefined,
        signedAt,
        ip,
        ipUnavailableReason,
        userAgent: userAgent || 'unknown',
      };
    })
  );

  const filtered = records.filter(Boolean) as SignedFieldRecord[];
  const fieldIds = filtered.map((record) => String(record.fieldId));

  return { records: filtered, fieldIds };
}

export async function upsertSignedFieldRecords(records: SignedFieldRecord[]) {
  if (!records || records.length === 0) return;
  const ops = records.map((record) => ({
    updateOne: {
      filter: {
        documentId: record.documentId,
        version: record.version,
        recipientId: record.recipientId,
        fieldId: record.fieldId,
      },
      update: { $setOnInsert: record },
      upsert: true,
    },
  }));
  await SignatureModel.bulkWrite(ops, { ordered: false });
}

export async function deleteSignedFieldRecords(args: {
  documentId: unknown;
  version: number;
  recipientId: string;
  fieldIds: string[];
}) {
  const { documentId, version, recipientId, fieldIds } = args;
  if (!fieldIds || fieldIds.length === 0) return;
  await SignatureModel.deleteMany({
    documentId,
    version,
    recipientId,
    fieldId: { $in: fieldIds },
  });
}
