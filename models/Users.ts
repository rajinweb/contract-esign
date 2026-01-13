import mongoose from 'mongoose';

const SignatureItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // UUID
  type: { type: String, enum: ['typed', 'drawn'], required: true },
  value: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: false },
  picture: { type: String, required: false },

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
});

export default mongoose.models.Users || mongoose.model('Users', UserSchema);
