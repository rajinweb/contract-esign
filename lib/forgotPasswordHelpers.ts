import crypto from 'crypto';
import Users from '@/models/Users';

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return await Users.findOne({ email: normalizedEmail }).select('_id email isActive isDeleted');
}

export async function generatePasswordResetToken(userId: string) {
  // Generate raw token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash it for DB storage
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Set expiry (1 hour)
  const expires = new Date(Date.now() + 3600000);

  const updated = await Users.updateOne(
    { _id: userId },
    {
      $set: {
        passwordResetToken: {
          token: hashedToken,
          expires,
        },
      },
    }
  ).exec();

  if (updated.matchedCount !== 1) {
    throw new Error('User not found');
  }

  // Return raw token (this is what goes in the email)
  return rawToken;
}
