import { describe, it, expect } from 'vitest';
import { getUpdatedDocumentStatus } from '../lib/statusLogic';

describe('statusLogic', () => {
  it('returns draft when no recipients', () => {
    const doc: any = { status: 'draft', recipients: [] };
    expect(getUpdatedDocumentStatus(doc)).toBe('draft');
  });

  it('returns sent when recipients are sent/viewed', () => {
    const doc: any = { status: 'draft', recipients: [{ status: 'sent' }] };
    expect(getUpdatedDocumentStatus(doc)).toBe('sent');
  });

  it('returns in_progress when some signed and some pending', () => {
    const doc: any = {
      status: 'sent',
      recipients: [
        { role: 'signer', status: 'signed', signedVersion: 2 },
        { role: 'signer', status: 'sent' },
      ],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('in_progress');
  });

  it('returns completed when all signers signed and approvers approved', () => {
    const doc: any = {
      status: 'sent',
      recipients: [
        { role: 'signer', status: 'signed', signedVersion: 2 },
        { role: 'approver', status: 'approved' },
      ],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('completed');
  });

  it('does not complete if approver is pending', () => {
    const doc: any = {
      status: 'sent',
      recipients: [
        { role: 'signer', status: 'signed', signedVersion: 2 },
        { role: 'approver', status: 'sent' },
      ],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('in_progress');
  });

  it('returns completed if completion evidence exists', () => {
    const doc: any = {
      status: 'sent',
      versions: [{ label: 'signed_final' }],
      recipients: [{ status: 'pending' }],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('completed');
  });

  it('returns expired when past expiresAt', () => {
    const doc: any = {
      status: 'sent',
      recipients: [{ status: 'sent' }],
      expiresAt: new Date(Date.now() - 1000),
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('expired');
  });

  it('returns delivery_failed when any recipient failed', () => {
    const doc: any = {
      status: 'sent',
      recipients: [{ status: 'delivery_failed' }],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('delivery_failed');
  });

  it('returns rejected when a signer rejects', () => {
    const doc: any = {
      status: 'sent',
      recipients: [{ role: 'signer', status: 'rejected' }],
    };
    expect(getUpdatedDocumentStatus(doc)).toBe('rejected');
  });

  it('keeps voided and cancelled statuses', () => {
    expect(getUpdatedDocumentStatus({ status: 'voided', recipients: [] } as any)).toBe('voided');
    expect(getUpdatedDocumentStatus({ status: 'cancelled', recipients: [] } as any)).toBe(
      'cancelled'
    );
  });
});
