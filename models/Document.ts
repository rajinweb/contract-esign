import mongoose, { Schema, model } from 'mongoose';

export interface IDocument extends mongoose.Document {
  _id: string;
  userId: string;
  documentName: string;
  originalFileName: string;
  currentVersion: number;
  versions: IDocumentVersion[];
  recipients: IDocumentRecipient[];
  status: 'draft' | 'sent' | 'completed' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentVersion {
  version: number;
  pdfData: Buffer;
  fields: IDocumentField[];
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'completed' | 'expired';
  changeLog: string;
}

export interface IDocumentField {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox' | 'image' | 'initials';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  recipientId?: string;
  required: boolean;
  value?: string;
  placeholder?: string;
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
  type: { type: String, required: true, enum: ['signature', 'text', 'date', 'checkbox', 'image', 'initials'] },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  pageNumber: { type: Number, required: true },
  recipientId: { type: String },
  required: { type: Boolean, default: true },
  value: { type: String },
  placeholder: { type: String },
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

const DocumentVersionSchema = new Schema<IDocumentVersion>({
  version: { type: Number, required: true },
  pdfData: { type: Buffer, required: true },
  fields: [DocumentFieldSchema],
  sentAt: { type: Date },
  signingToken: { type: String },
  expiresAt: { type: Date },
  status: { type: String, default: 'draft', enum: ['draft', 'sent', 'completed', 'expired'] },
  changeLog: { type: String, required: true },
});

const DocumentSchema = new Schema<IDocument>({
  userId: { type: String, required: true },
  documentName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  currentVersion: { type: Number, default: 1 },
  versions: [DocumentVersionSchema],
  recipients: [DocumentRecipientSchema],
  status: { type: String, default: 'draft', enum: ['draft', 'sent', 'completed', 'expired', 'cancelled'] },
}, { timestamps: true });

// Indexes for performance
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ 'versions.signingToken': 1 });

const DocumentModel = mongoose.models.Document || model<IDocument>('Document', DocumentSchema);

export default DocumentModel;