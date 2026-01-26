import { Phone } from 'lucide-react';
import mongoose from 'mongoose';

const SignatureItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // UUID
  type: { type: String, enum: ['typed', 'drawn'], required: true },
  value: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const AddressSchema = new mongoose.Schema({
  country: { type: String },
  street: { type: String },
  apartment: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
}, { _id: false }); // _id: false prevents subdocument id creation

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  picture: { type: String, required: false },
  phone: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  address: { type: AddressSchema, required: false },
  role: { type: String, default: 'user' },

  // Added for password reset
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
});

export default mongoose.models.Users || mongoose.model('Users', UserSchema);
