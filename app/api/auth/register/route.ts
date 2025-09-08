import { NextResponse } from 'next/server';
import Users from '@/models/Users';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, picture } = body;

    // Optional: check if user already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    // Create and save user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({ email, password: hashedPassword, name, picture }); // Hash password in real apps
    await newUser.save();

    return NextResponse.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

async function hashPasswords() {
  const users = await Users.find({});
  for (const user of users) {
    if (!user.password) {
    console.warn(`User ${user.email} has no password set. Skipping.`);
    continue;
  }
  if (!user.password.startsWith('$2')) {
    const hashed = await bcrypt.hash(user.password, 10);
    user.password = hashed;
    await user.save();
  }
  }
}

hashPasswords();