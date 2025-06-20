import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return; // Use existing connection
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordResetToken: {
    token: String,
    expires: Date,
  },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function getUserByEmail(email: string) {
  await connectDB();
  const user = await User.findOne({ email });
  return user;
}

export async function generatePasswordResetToken(userId: string) {
  await connectDB();
  const token = require('crypto').randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // Token expires in 1 hour

  await User.findByIdAndUpdate(userId, {
    passwordResetToken: {
      token,
      expires,
    },
  });
  return token;
}

export default connectDB;