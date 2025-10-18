import { NextRequest, NextResponse } from 'next/server';
import Users from '@/models/Users';
import connectDB from '@/utils/db';
import { getUserIdFromReq } from '@/lib/auth';


// Define a flexible type for user settings
interface UserSettings {
  [key: string]: unknown; // Allows dynamic key-value pairs
}
// Define the structure of the user document
interface User {
  settings?: UserSettings;
  [key: string]: unknown; // Allows other fields in the lean document
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