import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import Users from '@/models/Users';
import connectDB from '@/utils/db';
import { createAuthToken, setAuthTokenCookie } from '@/lib/auth';

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

    await connectDB();

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

    const appToken = createAuthToken({ id: user._id.toString(), email: user.email });
    if (!appToken) {
      console.error('JWT_SECRET not defined');
      return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, name: user.name, picture: user.picture },
      token: appToken,
    });

    setAuthTokenCookie(response, appToken);

    return response;
  } catch (err) {
    console.error('Google auth error', err);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}
