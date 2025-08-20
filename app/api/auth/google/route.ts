import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { serialize } from 'cookie';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json(); 
    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    // Verify with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Invalid Google token' }, { status: 401 });
    }

    // Extract Google user info
    const { sub, email, name, picture } = payload;
    const response = NextResponse.json({
      success: true,
      message: 'Google login successful',
      user: { id: sub, email, name, picture },
    });

    // Set cookie
    response.headers.set(
      'Set-Cookie',
      serialize('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      })
    );

    return response;
  } catch (error) {
    console.error('Google login error:', error);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}
