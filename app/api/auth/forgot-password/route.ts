import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import connectDB from '@/utils/db';
import { getUserByEmail, generatePasswordResetToken } from '@/lib/forgotPasswordHelpers';

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();
    
    const user = await getUserByEmail(email)
    
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    
    const resetToken = await generatePasswordResetToken(user._id.toString());

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html: `<p>You requested a password reset. Click below:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
