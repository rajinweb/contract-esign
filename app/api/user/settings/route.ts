import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Users from '@/models/Users';
import jwt from 'jsonwebtoken';

// Define the structure of the JWT payload
interface JwtPayload {
  id: string;
}

// Define a flexible type for user settings
interface UserSettings {
  [key: string]: unknown; // Allows dynamic key-value pairs
}

// Define the structure of the user document
interface User {
  settings?: UserSettings;
  [key: string]: unknown; // Allows other fields in the lean document
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

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const user = await Users.findById(userId).lean() as User | null;
    const settings = user?.settings || {};
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const update: { settings: UserSettings } = { settings: body };
    await Users.findByIdAndUpdate(userId, { $set: { settings: update.settings } }, { new: true, upsert: false });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}