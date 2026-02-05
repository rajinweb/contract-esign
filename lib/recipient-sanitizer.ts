export function sanitizeRecipient(recipient: any) {
  if (!recipient) return recipient;
  const plain = typeof recipient?.toObject === 'function' ? recipient.toObject() : { ...recipient };
  if ('signingToken' in plain) {
    delete (plain as any).signingToken;
  }
  return plain;
}

export function sanitizeRecipients(recipients: any[]) {
  if (!Array.isArray(recipients)) return [];
  return recipients.map(sanitizeRecipient);
}
