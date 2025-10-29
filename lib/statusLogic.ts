import { IDocument } from "@/types/types";
import { Document } from "mongoose";

export const getUpdatedDocumentStatus = (
  document: IDocument): IDocument["status"] => {
  const recipients = document.recipients || [];

  // Condition: No recipients or all are pending
  if (recipients.length === 0 || recipients.every((r) => r.status === "pending")) {
    return "draft";
  }

  // Condition: Document cancelled manually
  if (document.status === "cancelled") {
    return "cancelled";
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

  const signersAndApprovers = recipients.filter(
    (r) => r.role === "signer" || r.role === "approver"
  );

  const allRequiredDone =
    signersAndApprovers.length > 0 &&
    signersAndApprovers.every(
      (r) => r.status === "signed" || r.status === "approved"
    );

  // Condition: All required recipients (signers + approvers) are done
  if (allRequiredDone) {
    return "completed";
  }

  // Condition: Only viewers present, all viewed
  if (signersAndApprovers.length === 0) {
    // This case is now handled by the "sent" or "in_progress" status if viewers have viewed.
    // If there are only viewers and all have viewed, it's still "in_progress" or "sent" until all have viewed.
    // If all viewers have viewed, and there are no signers/approvers, it should be completed.
    // Re-evaluating this logic: if there are only viewers, and all have viewed, the document is considered "completed" for its purpose.
    if (recipients.every(r => r.role === 'viewer' && r.status === 'viewed')) {
      return "completed";
    }
  }

  // Condition: Partial signing/approving still in progress
  // Condition: At least one recipient viewed but not completed
  if (recipients.some((r) => r.status === "viewed")) {
    return "in_progress";
  }

  // Condition: At least one recipient sent but no one viewed
  if (recipients.some((r) => r.status === "sent")) {
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