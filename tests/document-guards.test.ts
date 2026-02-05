import { describe, it, expect } from 'vitest';
import { hasAnySignedRecipient } from '../lib/document-guards';

describe('hasAnySignedRecipient', () => {
  it('returns true when any recipient is signed', () => {
    const doc = { recipients: [{ status: 'pending' }, { status: 'signed' }] };
    expect(hasAnySignedRecipient(doc)).toBe(true);
  });

  it('returns true when signedVersion is set', () => {
    const doc = { recipients: [{ status: 'pending', signedVersion: 2 }] };
    expect(hasAnySignedRecipient(doc)).toBe(true);
  });

  it('returns false when all pending without signedVersion', () => {
    const doc = { recipients: [{ status: 'pending' }, { status: 'sent' }] };
    expect(hasAnySignedRecipient(doc)).toBe(false);
  });
});
