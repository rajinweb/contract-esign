import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/utils/db';
import Users from '@/models/Users';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
}

async function getUserIdFromReq(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|; )token=([^;]+)/);
  const token = bearer || (match ? decodeURIComponent(match[1]) : null);
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await Users.findByIdAndUpdate(userId, { password: hashed });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}