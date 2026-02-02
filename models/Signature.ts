import mongoose, { Schema, Document } from 'mongoose';

export interface ISignature extends Document {
  documentId: mongoose.Types.ObjectId;
  version: number;
  recipientId: string;
  fieldId: string;
  signatureImageHash: string;
  payloadHash: string; // Hash of the data that was signed
  certificate?: string; // Signer certificate
  signedAt: Date;
  ip: string;
  userAgent: string;
}

const SignatureSchema: Schema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  version: { type: Number, required: true },
  recipientId: { type: String, required: true },
  fieldId: { type: String, required: true },
  signatureImageHash: { type: String, required: true },
  payloadHash: { type: String, required: true },
  certificate: { type: String },
  signedAt: { type: Date, default: Date.now, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
});

export default mongoose.models.Signature || mongoose.model<ISignature>('Signature', SignatureSchema);
