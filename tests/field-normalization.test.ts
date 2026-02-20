import { describe, expect, it } from 'vitest';
import { normalizeFieldOwner, normalizeFields } from '../lib/field-normalization';

describe('field-normalization', () => {
  it('normalizes field owner variants', () => {
    expect(normalizeFieldOwner({ fieldOwner: 'recipient' })).toBe('recipients');
    expect(normalizeFieldOwner({ fieldOwner: 'recipients' })).toBe('recipients');
    expect(normalizeFieldOwner({ recipientId: 'r1' })).toBe('recipients');
    expect(normalizeFieldOwner({ fieldOwner: 'me' })).toBe('me');
    expect(normalizeFieldOwner({})).toBe('me');
  });

  it('keeps toObject bound for mongoose-like subdocuments', () => {
    const mongooseLike = {
      fieldOwner: 'recipient',
      recipientId: 'r1',
      id: 'f1',
      toObject(this: { fieldOwner: string; recipientId: string; id: string }) {
        return {
          fieldOwner: this.fieldOwner,
          recipientId: this.recipientId,
          id: this.id,
        };
      },
    };

    const detached = mongooseLike.toObject;
    expect(() => detached()).toThrow();

    const normalized = normalizeFields([mongooseLike as unknown]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      id: 'f1',
      recipientId: 'r1',
      fieldOwner: 'recipients',
    });
  });

  it('handles nullish field entries without crashing', () => {
    const normalized = normalizeFields([undefined as unknown, null as unknown, { id: 'f2' } as unknown]);
    expect(normalized).toHaveLength(3);
    expect(normalized[0].fieldOwner).toBe('me');
    expect(normalized[1].fieldOwner).toBe('me');
    expect(normalized[2].fieldOwner).toBe('me');
  });
});
