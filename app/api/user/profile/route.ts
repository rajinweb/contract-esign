import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Users from '@/models/Users';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

async function getUserIdFromReq(req: NextRequest) {
  // 1) check Authorization header
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const token = bearer || (() => {
    // 2) check cookie 'token' if present
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as any;
    return decoded?.id || null;
  } catch (err) {
    console.error('Token verify error', err);
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, picture } = body;

    const update: any = {};
    if (typeof name === 'string') update.name = name;
    if (typeof picture === 'string') update.picture = picture;

    const user = await Users.findByIdAndUpdate(new mongoose.Types.ObjectId(userId), update, { new: true }).lean();
    if (!user || Array.isArray(user)) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // return sanitized user
    const safe = {
      email: user.email,
      name: user.name || '',
      picture: user.picture || '',
      id: user._id,
    };

    return NextResponse.json({ user: safe });
  } catch (err) {
    console.error('Profile update error', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}