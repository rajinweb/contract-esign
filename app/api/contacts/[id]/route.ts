import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import Contact from '@/models/Contact';

// GET - Fetch a specific contact
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthSession(req);
    const contactId = (await context.params).id;

    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID missing' }, { status: 400 });
    }

    const contact = await Contact.findOne({ _id: contactId, userId });

    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('API Error in GET /api/contacts/[id]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - Update a contact
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthSession(req);
    const contactId = (await context.params).id;

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
    console.error('API Error in PUT /api/contacts/[id]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - Delete a contact
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthSession(req);
    const contactId = (await context.params).id;

    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID missing' }, { status: 400 });
    }

    const contact = await Contact.findOneAndDelete({ _id: contactId, userId });

    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('API Error in DELETE /api/contacts/[id]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}