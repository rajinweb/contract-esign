import { describe, expect, it } from 'vitest';
import { getRecipientKey } from '../utils/builder/recipientKeys';

describe('recipient key helper', () => {
  it('uses recipient id when available', () => {
    expect(getRecipientKey({ id: 'r1', email: 'a@example.com' }, 0)).toBe('r1');
  });

  it('falls back to email when id is missing', () => {
    expect(getRecipientKey({ id: '', email: 'a@example.com' }, 1)).toBe('a@example.com');
  });

  it('uses deterministic index fallback', () => {
    expect(getRecipientKey({ id: '', email: '' }, 3)).toBe('recipient_3');
  });
});
