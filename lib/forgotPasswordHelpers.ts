import crypto from 'crypto';
import Users from '../models/Users';

export async function getUserByEmail(email: string) {
  return await Users.findOne({ email });
}

export async function generatePasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // Token expires in 1 hour

  await Users.findByIdAndUpdate(userId, {
    passwordResetToken: {
      token,
      expires,
    },
  });
  return token;
}