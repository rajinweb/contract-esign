export function hasAnySignedRecipient(doc: any): boolean {
  const recipients = Array.isArray(doc?.recipients) ? doc.recipients : [];
  return recipients.some((r: any) => {
    if (!r) return false;
    if (r.status === 'signed' || r.status === 'approved') return true;
    return r.signedVersion !== undefined && r.signedVersion !== null;
  });
}
