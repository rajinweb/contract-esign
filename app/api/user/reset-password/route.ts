import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/utils/db';
import Users from '@/models/Users';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Hash the incoming raw token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by stored hashed token + expiry
    const user = await Users.findOne({
      'passwordResetToken.token': hashedToken,
      'passwordResetToken.expires': { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password & clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = { token: null, expires: null };
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
