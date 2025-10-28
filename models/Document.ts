import mongoose, { Schema } from 'mongoose';
import { DocumentField, IDocument, Recipient } from '@/types/types';

export interface IEditHistory {
  sessionId: string;
  fields: DocumentField[];
  documentName?: string;
  timestamp: Date;
  changeLog: string;
}

export interface IDocumentVersion {
  version: number;
  fileUrl?: string;
  pdfData?: Buffer;
  fields: DocumentField[];
  documentName: string;
  filePath: string;
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'final';
  changeLog: string;
  editHistory: IEditHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentRecipient extends Recipient {
  sendReminders: boolean;
  reminderDays?: number; // optional if reminders are off
  expiresAt?: Date | null;

  // Timestamps for actions
  signedAt?: Date;
  approvedAt?: Date;   // track approver approval time
  rejectedAt?: Date;   // track rejection time
  viewedAt?: Date;     // track when the document was viewed

  // Additional metadata
  ipAddress?: string;  // optional IP for audit
  token?: string;      // unique token URL for signing
  color: string;      // UI color per recipient (optional)
  isCC?: boolean;      // marks CC recipients
  order: number;      // signing order (optional for viewers)
}

const DocumentFieldSchema = new Schema<DocumentField>({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['signature', 'text', 'date', 'checkbox', 'image', 'initials', 'realtime_photo', 'stamp'] },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  pageNumber: { type: Number, required: true },
  recipientId: { type: String },
  required: { type: Boolean, default: true },
  value: { type: String, default: '' },
  placeholder: { type: String },
  mimeType: { type: String },
});

const DocumentRecipientSchema = new Schema<IDocumentRecipient>({
  id: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['signer', 'approver', 'viewer'] },
  //order: { type: Number, required: true },
  order: { type: Number, required: function () { return this.role !== 'viewer'; } },
  isCC: { type: Boolean, default: false },
  //color: { type: String, required: true },
  color: {
    type: String, default: function () {
      switch (this.role) {
        case 'signer': return '#3B82F6';
        case 'approver': return '#10B981';
        case 'viewer': return '#6B7280';
      }
    }
  },
  status: { type: String, default: 'pending', enum: ['pending', 'sent', 'viewed', 'signed', 'approved', 'rejected', 'delivery_failed', 'expired'] },
  signedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  ipAddress: { type: String },
  sendReminders: { type: Boolean, default: false },
  reminderDays: { type: Number },
  expiresAt: { type: Date },
});

const EditHistorySchema = new Schema<IEditHistory>({
  sessionId: { type: String, required: true },
  fields: [DocumentFieldSchema],
  documentName: { type: String },
  timestamp: { type: Date, default: Date.now },
  changeLog: { type: String, required: true },
});

export const DocumentVersionSchema = new Schema<IDocumentVersion>({
  version: { type: Number, required: true },
  pdfData: { type: Buffer, required: true },
  fields: [DocumentFieldSchema],
  documentName: { type: String, required: true },
  filePath: { type: String, required: true },
  sentAt: { type: Date },
  signingToken: { type: String, index: { unique: true, sparse: true } },
  expiresAt: { type: Date },
  status: { type: String, default: 'draft', enum: ['draft', 'sent', 'signed', 'expired', 'final'] },
  changeLog: { type: String, required: true },
  editHistory: { type: [EditHistorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DocumentSchema = new Schema<IDocument>({
  userId: { type: String, required: true },
  documentName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  currentVersion: { type: Number, default: 1 },
  currentSessionId: { type: String },
  versions: { type: [DocumentVersionSchema], default: [] },
  recipients: { type: [DocumentRecipientSchema], default: [] },
  status: { type: String, default: 'draft' },
  token: { type: String, sparse: true, unique: true },
}, { timestamps: true });

// Indexes for performance
DocumentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);