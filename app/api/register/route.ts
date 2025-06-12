import { NextResponse } from 'next/server';
import Users from '../../../models/Users';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Optional: check if user already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Create and save user
    const newUser = new Users({ email, password }); // Hash password in real apps
    await newUser.save();

    return NextResponse.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
