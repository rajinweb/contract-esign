import { describe, expect, it } from 'vitest';
import { buildTemplateRecipients } from '../lib/template-recipients';
import { normalizeTemplateDefaultSigners } from '../lib/template-signers';

describe('template signer normalization', () => {
  it('derives signers from field recipient ids when no default signers exist', () => {
    const signers = normalizeTemplateDefaultSigners(
      [],
      [{ recipientId: 'r1' }, { recipientId: 'r2' }, { recipientId: 'r1' }],
      'tpl_1'
    );

    expect(signers).toHaveLength(2);
    expect(signers[0]).toMatchObject({ id: 'r1', order: 1, role: 'signer' });
    expect(signers[1]).toMatchObject({ id: 'r2', order: 2, role: 'signer' });
  });

  it('normalizes malformed signer records', () => {
    const signers = normalizeTemplateDefaultSigners(
      [{ role: 'unknown', id: ' ', name: 123, email: 999 }],
      [],
      'abc123'
    );

    expect(signers).toHaveLength(1);
    expect(signers[0]).toMatchObject({
      id: 'recipient_abc123_1',
      role: 'signer',
      order: 1,
      name: '',
      email: '',
    });
  });

  it('maps normalized signers into recipient objects', () => {
    const recipients = buildTemplateRecipients(
      'tpl_2',
      [{ id: 'r1', name: 'Alice', email: 'alice@example.com', role: 'approver', order: 2 }],
      []
    );

    expect(recipients).toHaveLength(1);
    expect(recipients[0]).toMatchObject({
      id: 'r1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'approver',
      order: 2,
      status: 'pending',
      totalFields: 0,
    });
    expect(typeof recipients[0].color).toBe('string');
  });
});
