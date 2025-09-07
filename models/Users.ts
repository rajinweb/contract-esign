import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: false },
  picture: { type: String, required: false },
  id: { type: String, required: false },
});

export default mongoose.models.Users || mongoose.model('Users', UserSchema);