import { IDocument } from "@/types/types";
import { Document } from "mongoose";

const hasCompletionEvidence = (document: IDocument): boolean => {
  if (document.status === "completed") return true;
  if (document.completedAt || document.finalizedAt) return true;

  const versions = Array.isArray(document.versions) ? document.versions : [];
  if (versions.some((v: any) => v?.label === "signed_final")) return true;

  const recipients = Array.isArray(document.recipients) ? document.recipients : [];
  const signers = recipients.filter((r: any) => r?.role === "signer");
  const approvers = recipients.filter((r: any) => r?.role === "approver");
  const approversComplete =
    approvers.length === 0 || approvers.every((r: any) => r?.status === "approved");

  if (!approversComplete) {
    return false;
  }
  if (
    signers.length > 0 &&
    signers.every((r: any) => r?.status === "signed" && typeof r?.signedVersion === "number")
  ) {
    return true;
  }

  const signingEvents = Array.isArray(document.signingEvents) ? document.signingEvents : [];
  if (signers.length > 0 && signingEvents.length > 0) {
    const signedSet = new Set(
      signingEvents
        .filter((e: any) => e?.action === "signed" && e?.recipientId)
        .map((e: any) => String(e.recipientId))
    );
    const signerIds = signers.map((s: any) => String(s.id)).filter(Boolean);
    if (signerIds.length > 0 && signerIds.every((id: string) => signedSet.has(id))) {
      return true;
    }
  }

  return false;
};

export const getUpdatedDocumentStatus = (
  document: IDocument): IDocument["status"] => {
  const recipients = document.recipients || [];
  const signers = recipients.filter((r: any) => r?.role === "signer");
  const approvers = recipients.filter((r: any) => r?.role === "approver");
  const approversComplete =
    approvers.length === 0 || approvers.every((r: any) => r?.status === "approved");

  // Condition: Document voided/cancelled manually
  if (document.status === "voided") {
    return "voided";
  }
  if (document.status === "cancelled") {
    return "cancelled";
  }

  // Condition: Completion evidence should never be downgraded
  if (hasCompletionEvidence(document)) {
    return "completed";
  }

  // Condition: No recipients or all are pending
  if (recipients.length === 0 || recipients.every((r) => r.status === "pending")) {
    return "draft";
  }

  // Condition: Any recipient has delivery_failed
  if (recipients.some((r) => r.status === "delivery_failed")) {
    return "delivery_failed";
  }

  // Condition: Any signer/approver has rejected
  if (
    recipients.some(
      (r) =>
        (r.role === "signer" || r.role === "approver") && r.status === "rejected"
    )
  ) {
    return "rejected";
  }

  // Condition: Document expired
  if (document.expiresAt && new Date(document.expiresAt) < new Date()) {
    return "expired";
  }

  const signersComplete =
    signers.length > 0 &&
    signers.every((r: any) => r?.status === "signed" && typeof r?.signedVersion === "number");

  // Condition: All recipients are signed
  if (signersComplete && approversComplete) {
    return "completed";
  }

  const hasCompletedRecipient = recipients.some(
    (r) => r.status === "signed" || r.status === "approved"
  );
  const hasIncompleteRecipient = recipients.some(
    (r) => r.status !== "signed" && r.status !== "approved"
  );

  // Condition: Partial completion (some completed, some pending)
  if (hasCompletedRecipient && hasIncompleteRecipient) {
    return "in_progress";
  }

  // Note: completion requires all recipients to be signed per audit policy.

  // Condition: At least one recipient sent or viewed but no one signed
  if (recipients.some((r) => r.status === "sent" || r.status === "viewed")) {
    return "sent";
  }

  return document.status; // Fallback to current status
};

// This function handles the Mongoose document and applies the status logic.
export const updateDocumentStatus = (
  doc: Document & IDocument): void => {
  // Mongoose documents have a toObject() method that returns a plain JavaScript object.
  // This is important because getUpdatedDocumentStatus expects a plain IDocument object,
  // not a Mongoose Document instance, which might have additional methods/properties.
  const plainDoc = doc.toObject({ virtuals: true }) as IDocument;
  const newStatus = getUpdatedDocumentStatus(plainDoc);
  doc.status = newStatus;
};
