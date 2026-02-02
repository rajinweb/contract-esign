import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  documentId: mongoose.Types.ObjectId;
  actor: string; // Can be userId, recipientId, or 'system'
  action: string; // e.g., 'document_created', 'recipient_signed', 'document_sent'
  timestamp: Date;
  metadata?: Record<string, any>;
}

const AuditLogSchema: Schema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
});

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
