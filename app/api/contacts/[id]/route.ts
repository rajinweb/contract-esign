import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import Contact from '@/models/Contact';

// Utility to extract contact ID from the request URL
function getContactIdFromUrl(req: NextRequest): string | null {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];
  return id || null;
}

// GET - Fetch a specific contact
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const contactId = getContactIdFromUrl(req);
    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID missing' }, { status: 400 });
    }

    const contact = await Contact.findOne({ _id: contactId, userId });
    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a contact
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const contactId = getContactIdFromUrl(req);
    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID missing' }, { status: 400 });
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

    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, userId },
      {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        jobTitle,
        address,
        description,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a contact
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const contactId = getContactIdFromUrl(req);
    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID missing' }, { status: 400 });
    }

    const contact = await Contact.findOneAndDelete({ _id: contactId, userId });
    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}