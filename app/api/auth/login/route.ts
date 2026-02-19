import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Users from '@/models/Users';
import connectDB from '@/utils/db';
import { createAuthToken, setAuthTokenCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    await connectDB();

    const user = await Users.findOne({ email });

    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const appToken = createAuthToken({ id: user._id.toString(), email: user.email });
    if (!appToken) {
      console.error('JWT_SECRET not defined');
      return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        picture: user.picture,
        initials: user.initials || [],
        signatures: user.signatures || [],
        stamps: user.stamps || []
      },
      token: appToken
    });

    setAuthTokenCookie(response, appToken);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
