import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import Contact from '@/models/Contact';

// GET - Fetch all contacts
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    const contacts = await Contact.find({ userId });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('API Error in GET /api/contacts', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Create a new contact
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    const body = await req.json();
    const { firstName, lastName, email, phone, companyName, jobTitle, address, description } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { message: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const newContact = new Contact({
      userId,
      firstName,
      lastName,
      email,
      phone,
      companyName,
      jobTitle,
      address,
      description,
    });

    await newContact.save();

    return NextResponse.json({ contact: newContact }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/contacts', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
