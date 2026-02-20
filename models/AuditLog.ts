import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId | null;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  // Legacy document-audit fields retained for existing routes.
  documentId?: mongoose.Types.ObjectId;
  actor?: string;
  timestamp?: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Users', index: true, default: null },
    action: { type: String, required: true, index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
    actor: { type: String },
    timestamp: { type: Date },
  },
  { minimize: false }
);

const AuditLogModel =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLogModel;
