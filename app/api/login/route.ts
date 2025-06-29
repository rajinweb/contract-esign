import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const UserSchema = new mongoose.Schema({ email: String, password: String });
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const user = await UserModel.findOne({ email });
    console.log('User from DB:', user);
    console.log('Submitted password:', password);
    console.log('Hashed password from DB:', user?.password);

    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable for secret
    const token = jwt.sign(
      { userId: user._id, email: user.email }, // Payload with user info
      jwtSecret,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    return NextResponse.json({
      message: 'Login successful',
      token, 
      user: { 
        email: user.email, 
        name: 'Rajesh', 
        photo: null
       }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}