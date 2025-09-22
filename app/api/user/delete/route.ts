import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import Users from '@/models/Users';
import { serialize } from 'cookie';


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