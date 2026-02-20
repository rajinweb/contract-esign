type RecipientShape = Record<string, unknown> & { toObject?: () => Record<string, unknown> };

export function sanitizeRecipient(recipient: unknown) {
  if (!recipient) return recipient;
  const source = recipient as RecipientShape;
  const plain = typeof source?.toObject === 'function' ? source.toObject() : { ...source };
  if ('signingToken' in plain) {
    delete plain.signingToken;
  }
  return plain;
}

export function sanitizeRecipients(recipients: unknown[]) {
  if (!Array.isArray(recipients)) return [];
  return recipients.map(sanitizeRecipient);
}
