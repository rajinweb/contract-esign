import mongoose, { Schema } from 'mongoose';
import { DocumentField, IDocument as BaseIDocument, Recipient, IDocumentVersion, IEditHistory } from '@/types/types';

// The base IDocument from @/types/types is missing properties defined in the schema below.
// We extend it here to create a complete interface for our Document model, resolving the type error.
export interface IDocument extends BaseIDocument {
  templateId?: mongoose.Schema.Types.ObjectId;
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
  token?: string;      // unique token URL for signing
  color: string;      // UI color per recipient (optional)
  isCC?: boolean;      // marks CC recipients
  order: number;      // signing order (optional for viewers)

  // --- Location ---
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    city?: string;
    state?: string;
    country?: string;
    capturedAt?: Date;
  };

  // --- Device info ---
  device?: {
    type?: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
    userAgent?: string;
  };

  // --- Network context ---
  network?: {
    ip?: string;
    isp?: string;
    ipLocation?: {
      city?: string;
      country?: string;
    };
  };

  // --- Consent (CRITICAL) ---
  consent?: {
    locationGranted?: boolean;
    grantedAt?: Date;
    method?: 'system_prompt' | 'checkbox';
  };
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
  pageRect: { type: Schema.Types.Mixed },
});

const DocumentRecipientSchema = new Schema<IDocumentRecipient>({
  id: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['signer', 'approver', 'viewer'] },
  captureGpsLocation: { type: Boolean, default: false }, // ✅ REQUIRED
  //order: { type: Number, required: true },
  order: { type: Number, required: function (): boolean { return this.role !== 'viewer'; } },
  isCC: { type: Boolean, default: false },
  //color: { type: String, required: true },
  color: {
    type: String, default: function (): string {
      switch (this.role) {
        case 'signer': return '#3B82F6';
        case 'approver': return '#10B981';
        case 'viewer': return '#6B7280';
        default: return '#6B7280';
      }
    }
  },
  status: { type: String, default: 'pending', enum: ['pending', 'sent', 'viewed', 'signed', 'approved', 'rejected', 'delivery_failed', 'expired'] },
  signedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  sendReminders: { type: Boolean, default: false },
  reminderDays: { type: Number },
  expiresAt: { type: Date },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracyMeters: { type: Number },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    capturedAt: { type: Date },
  },
  device: {
    type: { type: String, enum: ['mobile', 'desktop', 'tablet'] },
    os: { type: String },
    browser: { type: String },
    userAgent: { type: String },
  },
  network: {
    ip: { type: String },
    isp: { type: String },
    ipLocation: {
      city: { type: String },
      country: { type: String },
    },
  },
  consent: {
    locationGranted: { type: Boolean },
    grantedAt: { type: Date },
    method: { type: String, enum: ['system_prompt', 'checkbox'] },
  },
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
  pdfData: { type: Buffer, required: false },
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
  canvasWidth: { type: Number },
  canvasHeight: { type: Number, },
});

const DocumentSchema = new Schema<IDocument>({
  userId: { type: String, required: true },
  documentName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  currentVersion: { type: Number, default: 1 },
  currentSessionId: { type: String },
  versions: { type: [DocumentVersionSchema], default: [] },
  recipients: { type: [DocumentRecipientSchema], default: [] },
  status: {
    type: String,
    default: 'draft',
    enum: [
      'draft', 'sent', 'signed', 'expired', 'final', 'rejected', 'pending',
      'completed', 'in_progress', 'cancelled', 'delivery_failed'
    ]
  },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', sparse: true, required: false },
  token: { type: String, sparse: true, unique: true },
  isTemplate: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for performance
DocumentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);