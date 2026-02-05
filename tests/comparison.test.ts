import { describe, it, expect } from 'vitest';
import { areDroppedComponentsEqual, areRecipientsEqual } from '../utils/comparison';

describe('comparison utilities', () => {
  it('compares dropped components regardless of order', () => {
    const base = {
      component: 'Signature',
      x: 10,
      y: 20,
      width: 100,
      height: 40,
      pageNumber: 1,
      assignedRecipientId: 'r1',
      required: true,
      data: '',
      placeholder: 'Sign here',
    };
    const a: any[] = [{ id: 2, ...base }, { id: 1, ...base }];
    const b: any[] = [{ id: 1, ...base }, { id: 2, ...base }];
    expect(areDroppedComponentsEqual(a, b)).toBe(true);
  });

  it('returns false when dropped component differs', () => {
    const a: any[] = [
      { id: 1, component: 'Signature', x: 10, y: 20, width: 100, height: 40, pageNumber: 1 },
    ];
    const b: any[] = [
      { id: 1, component: 'Signature', x: 11, y: 20, width: 100, height: 40, pageNumber: 1 },
    ];
    expect(areDroppedComponentsEqual(a, b)).toBe(false);
  });

  it('compares recipients ignoring order', () => {
    const a: any[] = [
      { id: 'b', email: 'b@example.com', name: 'B', role: 'signer' },
      { id: 'a', email: 'a@example.com', name: 'A', role: 'signer' },
    ];
    const b: any[] = [
      { id: 'a', email: 'a@example.com', name: 'A', role: 'signer' },
      { id: 'b', email: 'b@example.com', name: 'B', role: 'signer' },
    ];
    expect(areRecipientsEqual(a, b)).toBe(true);
  });
});
