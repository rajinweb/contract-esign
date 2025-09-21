import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Contact from '@/models/Contact';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
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

// GET - Fetch all contacts for the user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await Contact.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new contact
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      jobTitle,
      address,
      description,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { message: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Check if contact with same email already exists for this user
    const existingContact = await Contact.findOne({ email, userId });
    if (existingContact) {
      return NextResponse.json(
        { message: 'Contact with this email already exists' },
        { status: 400 }
      );
    }

    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      companyName,
      jobTitle,
      address,
      description,
      userId,
    });

    await newContact.save();
    return NextResponse.json({ contact: newContact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}