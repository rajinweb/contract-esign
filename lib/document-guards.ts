interface RecipientLike {
  id?: unknown;
  role?: unknown;
  status?: unknown;
  signedVersion?: unknown;
}

interface SigningEventLike {
  action?: unknown;
  recipientId?: unknown;
}

interface VersionLike {
  label?: unknown;
}

interface CompletionDocLike {
  status?: unknown;
  completedAt?: unknown;
  finalizedAt?: unknown;
  versions?: unknown;
  recipients?: unknown;
  signingEvents?: unknown;
}

function asRecipients(value: unknown): RecipientLike[] {
  return Array.isArray(value) ? (value as RecipientLike[]) : [];
}

function asSigningEvents(value: unknown): SigningEventLike[] {
  return Array.isArray(value) ? (value as SigningEventLike[]) : [];
}

function asVersions(value: unknown): VersionLike[] {
  return Array.isArray(value) ? (value as VersionLike[]) : [];
}

export function hasAnySignedRecipient(doc: CompletionDocLike): boolean {
  const recipients = asRecipients(doc?.recipients);
  return recipients.some((recipient) => {
    if (!recipient) return false;
    if (recipient.status === 'signed' || recipient.status === 'approved') return true;
    return recipient.signedVersion !== undefined && recipient.signedVersion !== null;
  });
}

interface CompletionEvidenceOptions {
  requireApproverCompletion?: boolean;
}

export function hasCompletionEvidence(
  doc: CompletionDocLike,
  options: CompletionEvidenceOptions = {}
): boolean {
  const requireApproverCompletion = options.requireApproverCompletion === true;

  if (doc?.status === 'completed') return true;
  if (doc?.completedAt || doc?.finalizedAt) return true;

  const versions = asVersions(doc?.versions);
  if (versions.some((version) => version?.label === 'signed_final')) return true;

  const recipients = asRecipients(doc?.recipients);
  const signers = recipients.filter((recipient) => recipient?.role === 'signer');

  if (requireApproverCompletion) {
    const approvers = recipients.filter((recipient) => recipient?.role === 'approver');
    const approversComplete =
      approvers.length === 0 || approvers.every((recipient) => recipient?.status === 'approved');
    if (!approversComplete) return false;
  }

  if (
    signers.length > 0 &&
    signers.every(
      (recipient) =>
        recipient?.status === 'signed' && typeof recipient?.signedVersion === 'number'
    )
  ) {
    return true;
  }

  const signingEvents = asSigningEvents(doc?.signingEvents);
  if (signers.length > 0 && signingEvents.length > 0) {
    const signedSet = new Set(
      signingEvents
        .filter((event) => event?.action === 'signed' && event?.recipientId)
        .map((event) => String(event.recipientId))
    );

    const signerIds = signers.map((signer) => String(signer.id)).filter(Boolean);
    if (signerIds.length > 0 && signerIds.every((id) => signedSet.has(id))) {
      return true;
    }
  }

  return false;
}
