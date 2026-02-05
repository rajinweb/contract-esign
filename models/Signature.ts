import mongoose, { Schema, Document } from 'mongoose';

export interface ISignature extends Document {
  documentId: mongoose.Types.ObjectId;
  version: number;
  recipientId: string;
  fieldId: string;
  fieldType: string;
  fieldValue?: string;
  fieldValueHash: string;
  fieldHash: string;
  signatureImageHash?: string;
  payloadHash: string; // Hash of the data that was signed
  certificate?: string; // Signer certificate
  signedAt: Date;
  ip?: string;
  ipUnavailableReason?: string;
  userAgent: string;
}

const SignatureSchema: Schema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  version: { type: Number, required: true },
  recipientId: { type: String, required: true },
  fieldId: { type: String, required: true },
  fieldType: { type: String, required: true },
  fieldValue: { type: String },
  fieldValueHash: { type: String, required: true },
  fieldHash: { type: String, required: true },
  signatureImageHash: {
    type: String,
    required: function (this: { fieldType?: string }) {
      return ['signature', 'initials', 'stamp', 'image', 'live_photo'].includes(this.fieldType || '');
    }
  },
  payloadHash: { type: String, required: true },
  certificate: { type: String },
  signedAt: { type: Date, default: Date.now, required: true },
  ip: { type: String },
  ipUnavailableReason: { type: String },
  userAgent: { type: String, required: true },
});

SignatureSchema.index(
  { documentId: 1, version: 1, recipientId: 1, fieldId: 1 },
  { unique: true }
);

export default mongoose.models.Signature || mongoose.model<ISignature>('Signature', SignatureSchema);
