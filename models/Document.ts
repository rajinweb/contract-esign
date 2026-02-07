import mongoose, { Schema } from 'mongoose';
import { DocumentField, IDocument as BaseIDocument, Recipient, IEditHistory } from '@/types/types';

// The base IDocument from @/types/types is missing properties defined in the schema below.
// We extend it here to create a complete interface for our Document model, resolving the type error.
export interface IDocument extends BaseIDocument {
  templateId?: mongoose.Schema.Types.ObjectId;
  deletedAt?: Date;
  statusBeforeDelete?: string;
  signingMode?: 'parallel' | 'sequential';
  signingEvents?: ISigningEvent[];
  auditTrailVersion?: number;
  completedAt?: Date;
  finalizedAt?: Date;
  derivedFromDocumentId?: mongoose.Schema.Types.ObjectId;
  derivedFromVersion?: number;
}

export interface IDocumentRecipient extends Recipient {
  sendReminders: boolean;
  reminderDays?: number; // optional if reminders are off
  expiresAt?: Date | null;

  // Timestamps for actions
  signedAt?: Date;
  signedVersion?: number | null;
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

  // --- Identity verification ---
  identityVerification?: {
    method?: 'email' | 'sms' | 'kba' | 'id_document' | 'bank_id' | 'selfie' | 'manual' | 'none';
    provider?: string;
    result?: 'passed' | 'failed' | 'skipped';
    verifiedAt?: Date;
    transactionId?: string;
    payloadHash?: string;
  };

  // --- Authentication context ---
  authentication?: {
    method?: 'email' | 'sms' | 'otp' | 'sso' | 'none';
    channel?: string;
    verifiedAt?: Date;
    transactionId?: string;
  };
}

const PageRectSchema = new Schema(
  {
    x: { type: Number },
    y: { type: Number },
    width: { type: Number },
    height: { type: Number },
    top: { type: Number },
    right: { type: Number },
    bottom: { type: Number },
    left: { type: Number },
  },
  { _id: false }
);

const DocumentFieldSchema = new Schema<DocumentField>({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['signature', 'text', 'date', 'checkbox', 'image', 'initials', 'live_photo', 'stamp'] },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  pageNumber: { type: Number, required: true },
  pageRect: { type: PageRectSchema },
  recipientId: { type: String },
  required: { type: Boolean, default: true },
  value: { type: String, default: null },
  placeholder: { type: String },
  mimeType: { type: String },
  fieldOwner: { type: String, default: 'recipient' },
});

const DocumentRecipientSchema = new Schema<IDocumentRecipient>({
  id: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['signer', 'approver', 'viewer'] },
  captureGpsLocation: { type: Boolean, default: false },
  order: { type: Number },
  isCC: { type: Boolean, default: false },
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
  signingToken: { type: String, required: true },
  viewedAt: { type: Date },
  status: { type: String, default: 'pending', enum: ['pending', 'sent', 'viewed', 'signed', 'approved', 'rejected', 'delivery_failed', 'expired'] },
  signedAt: { type: Date },
  signedVersion: { type: Number },
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
    ipUnavailableReason: { type: String },
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
  identityVerification: {
    method: { type: String, enum: ['email', 'sms', 'kba', 'id_document', 'bank_id', 'selfie', 'manual', 'none'] },
    provider: { type: String },
    result: { type: String, enum: ['passed', 'failed', 'skipped'] },
    verifiedAt: { type: Date },
    transactionId: { type: String },
    payloadHash: { type: String },
  },
  authentication: {
    method: { type: String, enum: ['email', 'sms', 'otp', 'sso', 'none'] },
    channel: { type: String },
    verifiedAt: { type: Date },
    transactionId: { type: String },
  },
});

const EditHistorySchema = new Schema<IEditHistory>({
  sessionId: { type: String, required: true },
  fields: [DocumentFieldSchema],
  documentName: { type: String },
  timestamp: { type: Date, default: Date.now },
  changeLog: { type: String, required: true },
});

// Storage reference for object storage (S3, GCS, Azure, etc.)
const StorageRefSchema = new Schema({
  provider: { type: String, enum: ['s3', 'gcs', 'azure', 'cloudinary', 'r2', 'local-dev'], required: true },
  bucket: { type: String, required: function (this: { provider: string }) { return ['s3', 'gcs', 'azure', 'r2', 'local-dev'].includes(this.provider); } },
  region: { type: String },
  key: { type: String, required: function (this: { provider: string }) { return ['s3', 'gcs', 'azure', 'r2', 'local-dev'].includes(this.provider); } }, // object name/key/path
  url: { type: String }, // optional immutable URL or URI (e.g., s3://bucket/key)
  versionId: { type: String }, // optional for object versioning/WORM
}, { _id: false });



export interface IVersionDoc extends mongoose.Types.Subdocument {
  version: number;
  label: string;
  signedBy?: string[];
  renderedBy?: string;
  pdfSignedAt?: Date;
  changeMeta?: {
    action?: string;
    actorId?: string;
    actorRole?: string;
    signingMode?: string;
    baseVersion?: number;
    derivedFromVersion?: number;
    signedAt?: Date;
    source?: 'client' | 'server' | 'system';
  };
  storage: {
    provider: string;
    bucket?: string;
    region?: string;
    key?: string;
    url?: string;
    versionId?: string;
  };
  hash: string;
  hashAlgo?: string;
  size: number;
  mimeType: string;
  locked: boolean;
  derivedFromVersion?: number;
  sentAt?: Date;
  expiresAt?: Date;
  fields?: DocumentField[];
  documentName?: string;
  status: 'draft' | 'locked' | 'final';
  changeLog?: string;
  ingestionNote?: string;
  editHistory?: IEditHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export const DocumentVersionSchema = new Schema<IVersionDoc>({
  version: { type: Number, required: true },
  label: { type: String, required: true },
  signedBy: { type: [String], default: undefined },
  renderedBy: { type: String },
  pdfSignedAt: { type: Date },
  changeMeta: {
    action: { type: String },
    actorId: { type: String },
    actorRole: { type: String },
    signingMode: { type: String },
    baseVersion: { type: Number },
    derivedFromVersion: { type: Number },
    signedAt: { type: Date },
    source: { type: String, enum: ['client', 'server', 'system'] },
  },
  storage: { type: StorageRefSchema, required: true },
  hash: { type: String, required: true },
  hashAlgo: { type: String, default: 'SHA-256' },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true, default: 'application/pdf' },
  locked: { type: Boolean, required: true, default: false },
  derivedFromVersion: { type: Number },
  sentAt: { type: Date },
  expiresAt: { type: Date },
  fields: { type: [DocumentFieldSchema], default: undefined },
  documentName: { type: String },
  changeLog: { type: String },
  ingestionNote: { type: String },
  editHistory: { type: [EditHistorySchema], default: undefined },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Signing State
export interface ISigningEvent extends mongoose.Types.Subdocument {
  recipientId: string;
  action?: 'sent' | 'viewed' | 'signed' | 'approved' | 'rejected';
  fields?: Array<{ fieldId: string; fieldHash: string }>;
  fieldsHash?: string;
  fieldsHashAlgo?: string;
  signatureHash?: string;
  signatureHashAlgo?: string;
  signedAt?: Date;
  sentAt?: Date;
  serverTimestamp?: Date;
  baseVersion?: number;
  targetVersion?: number;
  ip?: string;
  ipUnavailableReason?: string;
  userAgent?: string;
  order?: number;
  version?: number;
  client?: {
    ip?: string;
    userAgent?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
  };
  geo?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    city?: string;
    state?: string;
    country?: string;
    capturedAt?: Date;
    source?: string;
  };
  consent?: {
    locationGranted?: boolean;
    grantedAt?: Date;
    method?: 'system_prompt' | 'checkbox' | 'other';
  };
}

const SigningEventSchema = new Schema<ISigningEvent>({
  recipientId: { type: String, required: true },
  action: { type: String, enum: ['sent', 'viewed', 'signed', 'approved', 'rejected', 'voided'] },
  fields: {
    type: [
      {
        fieldId: { type: String, required: true },
        fieldHash: { type: String, required: true },
      }
    ],
    default: undefined
  },
  fieldsHash: { type: String },
  fieldsHashAlgo: { type: String, default: 'SHA-256' },
  signatureHash: { type: String },
  signatureHashAlgo: { type: String, default: 'SHA-256' },
  signedAt: { type: Date },
  sentAt: { type: Date },
  serverTimestamp: { type: Date },
  baseVersion: { type: Number },
  targetVersion: { type: Number },
  ip: { type: String },
  ipUnavailableReason: { type: String },
  userAgent: { type: String },
  order: { type: Number },
  version: { type: Number },
  client: {
    ip: { type: String },
    userAgent: { type: String },
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'] },
    os: { type: String },
    browser: { type: String },
  },
  geo: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracyMeters: { type: Number },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    capturedAt: { type: Date },
    source: { type: String },
  },
  consent: {
    locationGranted: { type: Boolean },
    grantedAt: { type: Date },
    method: { type: String, enum: ['system_prompt', 'checkbox', 'other'] },
  },
}, { _id: false });


const DocumentSchema = new Schema<IDocument>({
  userId: { type: String, required: true },
  documentName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  currentVersion: { type: Number, default: 0 },
  currentSessionId: { type: String },
  signingMode: { type: String, enum: ['parallel', 'sequential'], default: 'parallel' },
  versions: { type: [DocumentVersionSchema], default: [] },
  recipients: { type: [DocumentRecipientSchema], default: [] },
  signingEvents: { type: [SigningEventSchema], default: [] },
  auditTrailVersion: { type: Number, default: 1 },
  completedAt: { type: Date },
  finalizedAt: { type: Date },
  derivedFromDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  derivedFromVersion: { type: Number },
  status: {
    type: String,
    default: 'draft',
    enum: [
      'draft', 'sent', 'signed', 'expired', 'final', 'rejected', 'pending',
      'completed', 'in_progress', 'cancelled', 'voided', 'delivery_failed', 'trashed'
    ]
  },
  deletedAt: { type: Date, default: null },
  statusBeforeDelete: { type: String },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', sparse: true, required: false },
  token: { type: String, sparse: true, unique: true },
  isTemplate: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for performance
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentVersionSchema.index({ label: 1, version: 1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
