import { Recipient } from '@/types/types';

export function getRecipientKey(
  recipient: Pick<Recipient, 'id' | 'email'>,
  index: number
): string {
  if (typeof recipient.id === 'string' && recipient.id.trim().length > 0) {
    return recipient.id;
  }
  if (typeof recipient.email === 'string' && recipient.email.trim().length > 0) {
    return recipient.email;
  }
  return `recipient_${index}`;
}
