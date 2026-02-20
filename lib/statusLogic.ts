import { IDocument } from "@/types/types";
import { Document } from "mongoose";
import { hasCompletionEvidence } from "@/lib/document-guards";

export const getUpdatedDocumentStatus = (
  document: IDocument): IDocument["status"] => {
  const recipients = document.recipients || [];
  const signers = recipients.filter((r) => r?.role === "signer");
  const approvers = recipients.filter((r) => r?.role === "approver");
  const approversComplete =
    approvers.length === 0 || approvers.every((r) => r?.status === "approved");

  // Condition: Document voided/cancelled manually
  if (document.status === "voided") {
    return "voided";
  }
  if (document.status === "cancelled") {
    return "cancelled";
  }

  // Condition: Completion evidence should never be downgraded
  if (hasCompletionEvidence(document, { requireApproverCompletion: true })) {
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
    signers.every((r) => r?.status === "signed" && typeof r?.signedVersion === "number");

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
