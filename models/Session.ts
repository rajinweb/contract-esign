import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

export interface ISession {
  _id: string;
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    deviceInfo: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    minimize: false,
  }
);

SessionSchema.index({ userId: 1, revoked: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

SessionSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

const SessionModel =
  (mongoose.models.Session as mongoose.Model<ISession>) ||
  mongoose.model<ISession>('Session', SessionSchema);

export default SessionModel;
