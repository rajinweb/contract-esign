import mongoose, { Document } from 'mongoose';

export type UserRole = 'user' | 'admin' | 'owner' | 'auditor';

export interface ISignatureItem {
  id: string;
  type: 'typed' | 'drawn';
  value: string;
  isDefault: boolean;
}

export interface IAddress {
  country?: string;
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  picture?: string;
  phone?: string;
  address?: IAddress;
  role: UserRole;
  isActive: boolean;
  isDeleted: boolean;
  tokenVersion: number;
  mfaEnabled: boolean;
  mfaSecret?: string | null;
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  settings?: {
    twoFactor?: boolean;
    displayEsignId?: boolean;
    dateFormat?: string;
    inviteSubject?: string;
    inviteMessage?: string;
  };
  passwordResetToken?: {
    token?: string | null;
    expires?: Date | null;
  };
  initials: ISignatureItem[];
  signatures: ISignatureItem[];
  stamps: ISignatureItem[];
  createdAt: Date;
  updatedAt: Date;
}

const SignatureItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['typed', 'drawn'], required: true },
    value: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    country: { type: String },
    street: { type: String },
    apartment: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: false, select: false },
    // Legacy field retained for backward compatibility with existing flows.
    password: { type: String, required: false, select: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    name: { type: String, required: false },
    picture: { type: String, required: false },
    phone: { type: String, required: false },
    address: { type: AddressSchema, required: false },
    role: {
      type: String,
      enum: ['user', 'admin', 'owner', 'auditor'],
      default: 'user',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    tokenVersion: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: null, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    passwordResetToken: {
      token: { type: String },
      expires: { type: Date },
    },
    initials: {
      type: [SignatureItemSchema],
      default: [],
    },
    signatures: {
      type: [SignatureItemSchema],
      default: [],
    },
    stamps: {
      type: [SignatureItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

UserSchema.pre('save', function normalizeEmail(next) {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  next();
});

const UserModel =
  (mongoose.models.Users as mongoose.Model<IUser>) || mongoose.model<IUser>('Users', UserSchema);

export default UserModel;
