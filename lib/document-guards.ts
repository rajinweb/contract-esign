export function hasAnySignedRecipient(doc: any): boolean {
  const recipients = Array.isArray(doc?.recipients) ? doc.recipients : [];
  return recipients.some((r: any) => {
    if (!r) return false;
    if (r.status === 'signed' || r.status === 'approved') return true;
    return r.signedVersion !== undefined && r.signedVersion !== null;
  });
}

interface CompletionEvidenceOptions {
  requireApproverCompletion?: boolean;
}

export function hasCompletionEvidence(doc: any, options: CompletionEvidenceOptions = {}): boolean {
  const requireApproverCompletion = options.requireApproverCompletion === true;

  if (doc?.status === 'completed') return true;
  if (doc?.completedAt || doc?.finalizedAt) return true;

  const versions = Array.isArray(doc?.versions) ? doc.versions : [];
  if (versions.some((v: any) => v?.label === 'signed_final')) return true;

  const recipients = Array.isArray(doc?.recipients) ? doc.recipients : [];
  const signers = recipients.filter((r: any) => r?.role === 'signer');

  if (requireApproverCompletion) {
    const approvers = recipients.filter((r: any) => r?.role === 'approver');
    const approversComplete =
      approvers.length === 0 || approvers.every((r: any) => r?.status === 'approved');
    if (!approversComplete) return false;
  }

  if (
    signers.length > 0 &&
    signers.every((r: any) => r?.status === 'signed' && typeof r?.signedVersion === 'number')
  ) {
    return true;
  }

  const signingEvents = Array.isArray(doc?.signingEvents) ? doc.signingEvents : [];
  if (signers.length > 0 && signingEvents.length > 0) {
    const signedSet = new Set(
      signingEvents
        .filter((e: any) => e?.action === 'signed' && e?.recipientId)
        .map((e: any) => String(e.recipientId))
    );
    const signerIds = signers.map((s: any) => String(s.id)).filter(Boolean);
    if (signerIds.length > 0 && signerIds.every((id: string) => signedSet.has(id))) {
      return true;
    }
  }

  return false;
}
