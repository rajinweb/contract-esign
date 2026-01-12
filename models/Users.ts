import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: false },
  picture: { type: String, required: false },
  id: { type: String, required: false },

  // Added for password reset
  passwordResetToken: {
    token: { type: String },
    expires: { type: Date },
  },
  initials: [
    {
      id: { type: String },
      type: { type: String, required: true },
      value: { type: String, required: true },
      isDefault: { type: Boolean, required: true },
    },
  ],
});

export default mongoose.models.Users || mongoose.model('Users', UserSchema);
