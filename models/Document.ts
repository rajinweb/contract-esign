import mongoose, { Schema, Document } from 'mongoose';
import { IDocument } from '@/types/types';

export interface IDocumentVersion {
  version: number;
  pdfData: Buffer;
  fields: IDocumentField[];
  fileName: string;       // ✅ Add this
  filePath: string;       // ✅ Add this
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'completed' | 'expired';
  changeLog: string;
}

export interface IDocumentField {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox' | 'image' | 'initials' | 'realtime_photo';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  recipientId?: string;
  required: boolean;
  value?: string;
  placeholder?: string;
  mimeType?: string;
}

export interface IDocumentRecipient {
  id: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer';
  order: number;
  isCC: boolean;
  color: string;
  status: 'pending' | 'viewed' | 'signed' | 'approved' | 'declined';
  signedAt?: Date;
  ipAddress?: string;
}

const DocumentFieldSchema = new Schema<IDocumentField>({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['signature', 'text', 'date', 'checkbox', 'image', 'initials', 'realtime_photo'] },
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
  order: { type: Number, required: true },
  isCC: { type: Boolean, default: false },
  color: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'viewed', 'signed', 'approved', 'declined'] },
  signedAt: { type: Date },
  ipAddress: { type: String },
});

export const DocumentVersionSchema = new Schema<IDocumentVersion>({
  version: { type: Number, required: true },
  pdfData: { type: Buffer, required: true },
  fields: [DocumentFieldSchema],
  fileName: { type: String, required: true },     // ✅ Add this
  filePath: { type: String, required: true },     // ✅ Add this
  sentAt: { type: Date },
  signingToken: { type: String, index: { unique: true, sparse: true } },
  expiresAt: { type: Date },
  status: { type: String, default: 'draft', enum: ['draft', 'sent', 'completed', 'expired', 'final'] },
  changeLog: { type: String, required: true },
});

const DocumentSchema = new Schema<IDocument>({
  userId: { type: String, required: true },
  documentName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  currentVersion: { type: Number, default: 1 },
  // Use the detailed DocumentVersionSchema so filePath/fileName and other
  // metadata are persisted correctly and not stripped by a simpler inline schema.
  versions: { type: [DocumentVersionSchema], default: [] },
  recipients: { type: Array, default: [] },
  status: { type: String, default: 'draft' },
  token: { type: String, unique: true },
}, { timestamps: true });

// Indexes for performance
DocumentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);