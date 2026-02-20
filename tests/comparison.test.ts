import { describe, it, expect } from 'vitest';
import { areDroppedComponentsEqual, areRecipientsEqual } from '../utils/comparison';
import { DroppedComponent, Recipient } from '@/types/types';

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
    const a: DroppedComponent[] = [{ id: 2, ...base } as DroppedComponent, { id: 1, ...base } as DroppedComponent];
    const b: DroppedComponent[] = [{ id: 1, ...base } as DroppedComponent, { id: 2, ...base } as DroppedComponent];
    expect(areDroppedComponentsEqual(a, b)).toBe(true);
  });

  it('returns false when dropped component differs', () => {
    const a: DroppedComponent[] = [
      { id: 1, component: 'Signature', x: 10, y: 20, width: 100, height: 40, pageNumber: 1 } as DroppedComponent,
    ];
    const b: DroppedComponent[] = [
      { id: 1, component: 'Signature', x: 11, y: 20, width: 100, height: 40, pageNumber: 1 } as DroppedComponent,
    ];
    expect(areDroppedComponentsEqual(a, b)).toBe(false);
  });

  it('compares recipients ignoring order', () => {
    const a: Recipient[] = [
      { id: 'b', email: 'b@example.com', name: 'B', role: 'signer' } as Recipient,
      { id: 'a', email: 'a@example.com', name: 'A', role: 'signer' } as Recipient,
    ];
    const b: Recipient[] = [
      { id: 'a', email: 'a@example.com', name: 'A', role: 'signer' } as Recipient,
      { id: 'b', email: 'b@example.com', name: 'B', role: 'signer' } as Recipient,
    ];
    expect(areRecipientsEqual(a, b)).toBe(true);
  });
});
