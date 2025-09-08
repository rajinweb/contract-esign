import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Users from '@/models/Users';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

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
    const decoded = jwt.verify(token, secret) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    await Users.findByIdAndDelete(userId);
    const res = NextResponse.json({ success: true });
    // clear cookie
    res.headers.set('Set-Cookie', serialize('token', '', { httpOnly: true, maxAge: 0, path: '/' }));
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}