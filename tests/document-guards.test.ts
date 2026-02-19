import { describe, it, expect } from 'vitest';
import { hasAnySignedRecipient, hasCompletionEvidence } from '../lib/document-guards';

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

describe('hasCompletionEvidence', () => {
  it('returns true when all signers are signed', () => {
    const doc = {
      recipients: [
        { id: 's1', role: 'signer', status: 'signed', signedVersion: 2 },
        { id: 's2', role: 'signer', status: 'signed', signedVersion: 2 },
      ],
    };
    expect(hasCompletionEvidence(doc)).toBe(true);
  });

  it('can require approvers to be completed', () => {
    const doc = {
      recipients: [
        { id: 's1', role: 'signer', status: 'signed', signedVersion: 2 },
        { id: 'a1', role: 'approver', status: 'pending' },
      ],
    };
    expect(hasCompletionEvidence(doc)).toBe(true);
    expect(hasCompletionEvidence(doc, { requireApproverCompletion: true })).toBe(false);
  });

  it('returns true when signed_final version exists', () => {
    const doc = {
      versions: [{ label: 'prepared' }, { label: 'signed_final' }],
      recipients: [],
    };
    expect(hasCompletionEvidence(doc)).toBe(true);
  });
});
