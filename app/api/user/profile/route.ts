import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import Users from '@/models/Users';
import mongoose from 'mongoose';

// Define the structure of the update object
interface UpdateUser {
  name?: string;
  picture?: string;
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

    const update: UpdateUser = {};
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