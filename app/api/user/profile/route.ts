import { NextRequest, NextResponse } from 'next/server';
import Users from '@/models/Users';
import mongoose from 'mongoose';
import { getUserIdFromReq } from '@/lib/auth';
import connectDB from '@/utils/db';

// Unified interface for user doc and update
interface User {
  _id?: mongoose.Types.ObjectId;
  email?: string;
  name?: string;
  picture?: string;
  initials?: {
    id: string;
    type: "typed" | "drawn";
    value: string;
    isDefault: boolean;
  }[];
  signatures?: {
    id: string;
    type: "typed" | "drawn";
    value: string;
    isDefault: boolean;
  }[];
  stamps?: {
    id: string;
    type: "typed" | "drawn";
    value: string;
    isDefault: boolean;
  }[];
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body: User = await req.json();
    const { name, picture, initials, signatures, stamps } = body;

    const update: Partial<User> = {};
    if (typeof name === 'string') update.name = name;
    if (typeof picture === 'string') update.picture = picture;
    if (Array.isArray(initials)) update.initials = initials;
    if (Array.isArray(signatures)) update.signatures = signatures;
    if (Array.isArray(stamps)) update.stamps = stamps;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: 'Nothing to update' }, { status: 400 });
    }

    const user = await Users.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { $set: update },
      { new: true }
    ).lean<User>();

    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const safe = {
      email: user.email || '',
      name: user.name || '',
      picture: user.picture || '',
      id: user._id?.toString() || '',
      initials: user.initials || [],
      signatures: user.signatures || [],
      stamps: user.stamps || [],
    };

    return NextResponse.json({ user: safe });
  } catch (err) {
    console.error('Profile update error', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}