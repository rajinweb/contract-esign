import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import Contact from '@/models/Contact';

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