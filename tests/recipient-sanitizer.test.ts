import { describe, it, expect } from 'vitest';
import { sanitizeRecipient, sanitizeRecipients } from '../lib/recipient-sanitizer';

describe('sanitizeRecipient', () => {
  it('removes signingToken and preserves other fields', () => {
    const input = {
      id: 'r1',
      email: 'a@example.com',
      signingToken: 'secret',
      status: 'sent',
    };
    const result = sanitizeRecipient(input);
    expect(result.signingToken).toBeUndefined();
    expect(result.id).toBe('r1');
    expect(result.email).toBe('a@example.com');
    expect(result.status).toBe('sent');
  });
});

describe('sanitizeRecipients', () => {
  it('strips tokens from list', () => {
    const input = [
      { id: 'r1', signingToken: 'a' },
      { id: 'r2', signingToken: 'b', role: 'signer' },
    ];
    const result = sanitizeRecipients(input);
    expect(result[0].signingToken).toBeUndefined();
    expect(result[1].signingToken).toBeUndefined();
    expect(result[1].role).toBe('signer');
  });
});
