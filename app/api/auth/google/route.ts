import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Users from '@/models/Users';
import { serialize } from 'cookie';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ message: 'Token is required' }, { status: 400 });

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return NextResponse.json({ message: 'Invalid Google token' }, { status: 401 });
    }

    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not defined');
        return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
      }
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    // Use safe fallbacks for name/picture
    const name = payload.name || payload.given_name || '';
    const picture = payload.picture || '';

    const user = await Users.findOneAndUpdate(
      { email: payload.email },
      {
        email: payload.email,
        name,
        picture,
        id: payload.sub,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) {
      console.error('JWT_SECRET not defined');
      return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
    }

    const appToken = jwt.sign({ id: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '7d' });

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, name: user.name, picture: user.picture },
      token: appToken,
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
  } catch (err) {
    console.error('Google auth error', err);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}