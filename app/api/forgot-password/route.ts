import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import Users from '../../../models/Users';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Find user by email
    const user = await getUserByEmail(email);

    if (!user) {
      // It's often better practice not to reveal if an email exists
      return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' }, { status: 200 });
    }

    // Generate password reset token and store it
    const resetToken = await generatePasswordResetToken(user.id); // Implement this utility


    const transporter = nodemailer.createTransport({
      // Configure your email service provider here
      // Example with Gmail (requires allowing "less secure apps" or using App Passwords)
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`; 

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html: `<p>You requested a password reset. Click the link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 });
  }
}

export async function getUserByEmail(email: string) {
  const user = await Users.findOne({ email });
  return user;
}

export async function generatePasswordResetToken(userId: string) {
  const token = require('crypto').randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // Token expires in 1 hour

  await Users.findByIdAndUpdate(userId, {
    passwordResetToken: {
      token,
      expires,
    },
  });
  return token;
}