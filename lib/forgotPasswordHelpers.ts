import crypto from 'crypto';
import Users from '@/models/Users';

export async function getUserByEmail(email: string) {
  return await Users.findOne({ email });
}

export async function generatePasswordResetToken(userId: string) {
  // Generate raw token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash it for DB storage
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Set expiry (1 hour)
  const expires = new Date(Date.now() + 3600000);

  // Save to user
  const user = await Users.findById(userId);
  if (!user) throw new Error('User not found');

  user.passwordResetToken = {
    token: hashedToken,
    expires,
  };
  await user.save();

  // Return raw token (this is what goes in the email)
  return rawToken;
}
