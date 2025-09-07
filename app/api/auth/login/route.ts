import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Users from '@/models/Users';
import { serialize } from 'cookie';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not defined');
        return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
      }
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const user = await Users.findOne({ email });
    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) {
          console.error('JWT_SECRET not defined');
          return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
    }
    
    const appToken = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, name: user.name , picture: user.picture },
      token: appToken
    });
    
    // Set httpOnly cookie (secure only in production)
    response.headers.set(
      'Set-Cookie',
        serialize('token', appToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 3600,
        })
    );

  return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}