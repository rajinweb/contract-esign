import { describe, it, expect } from 'vitest';
import { buildSignedFieldRecords } from '../lib/signed-fields';

describe('buildSignedFieldRecords', () => {
  it('builds hashed records and honors event field hashes', async () => {
    const signedAt = new Date('2024-01-01T00:00:00Z');
    const { records, fieldIds } = await buildSignedFieldRecords({
      documentId: 'doc1',
      version: 2,
      recipientId: 'r1',
      signedAt,
      ip: '203.0.113.10',
      userAgent: 'test-agent',
      fields: [
        { id: 'f1', type: 'text', value: 'hello' },
        { id: 'f2', type: 'signature', value: 'signature-data' },
      ],
      eventFields: [{ fieldId: 'f1', fieldHash: 'event-hash' }],
    });

    expect(records).toHaveLength(2);
    expect(fieldIds).toEqual(['f1', 'f2']);

    const record1 = records.find((r) => r.fieldId === 'f1');
    const record2 = records.find((r) => r.fieldId === 'f2');

    expect(record1?.fieldHash).toBe('event-hash');
    expect(record1?.fieldValue).toBe('hello');
    expect(record1?.fieldValueHash).toHaveLength(64);
    expect(record1?.payloadHash).toHaveLength(64);

    expect(record2?.signatureImageHash).toHaveLength(64);
    expect(record2?.fieldType).toBe('signature');
  });
});
