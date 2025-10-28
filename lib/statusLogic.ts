import { IDocument } from "@/types/types";
import { Document } from "mongoose";

const ROLE_COMPLETION_STATUS: Record<string, string[]> = {
  signer: ["signed"],
  approver: ["approved"],
  viewer: ["viewed"],
};

export const getUpdatedDocumentStatus = (
  document: IDocument,
  currentUserId?: string
): IDocument["status"] => {
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
  const viewers = recipients.filter((r) => r.role === "viewer");

  const allRequiredDone =
    signersAndApprovers.length > 0 &&
    signersAndApprovers.every((r) =>
      ROLE_COMPLETION_STATUS[r.role]?.includes(r.status)
    );

  const allViewersDone =
    viewers.length > 0 &&
    viewers.every((r) => ROLE_COMPLETION_STATUS[r.role]?.includes(r.status));

  // Condition: All required recipients (signers + approvers) are done
  if (allRequiredDone) {
    return "completed";
  }

  // Condition: Only viewers present, all viewed
  if (signersAndApprovers.length === 0 && allViewersDone) {
    return "completed";
  }

  // Condition: Partial signing/approving still in progress
  if (
    signersAndApprovers.some((r) =>
      ROLE_COMPLETION_STATUS[r.role]?.includes(r.status)
    )
  ) {
    return "in_progress";
  }

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
  doc: Document & IDocument,
  currentUserId?: string
): void => {
  const plainDoc = doc.toObject() as IDocument;
  const newStatus = getUpdatedDocumentStatus(plainDoc, currentUserId);
  doc.status = newStatus;
};