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

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const contact: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      const lowerHeader = header.toLowerCase();

      // Map CSV headers to contact fields
      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        contact.firstName = value;
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        contact.lastName = value;
      } else if (lowerHeader.includes('email')) {
        contact.email = value;
      } else if (lowerHeader.includes('phone')) {
        contact.phone = value;
      } else if (lowerHeader.includes('company')) {
        contact.companyName = value;
      } else if (lowerHeader.includes('job') || lowerHeader.includes('title')) {
        contact.jobTitle = value;
      } else if (lowerHeader.includes('country')) {
        if (!contact.address) contact.address = {};
        contact.address.country = value;
      } else if (lowerHeader.includes('street') || lowerHeader.includes('address')) {
        if (!contact.address) contact.address = {};
        contact.address.streetAddress = value;
      } else if (lowerHeader.includes('apartment') || lowerHeader.includes('suite')) {
        if (!contact.address) contact.address = {};
        contact.address.apartment = value;
      } else if (lowerHeader.includes('city')) {
        if (!contact.address) contact.address = {};
        contact.address.city = value;
      } else if (lowerHeader.includes('state') || lowerHeader.includes('province')) {
        if (!contact.address) contact.address = {};
        contact.address.state = value;
      } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal')) {
        if (!contact.address) contact.address = {};
        contact.address.zipCode = value;
      } else if (lowerHeader.includes('description') || lowerHeader.includes('notes')) {
        contact.description = value;
      }
    });

    // Validate required fields
    if (contact.firstName && contact.lastName && contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ message: 'Only CSV files are supported' }, { status: 400 });
    }

    const csvText = await file.text();
    const contactsData = parseCSV(csvText);

    if (contactsData.length === 0) {
      return NextResponse.json({ 
        message: 'No valid contacts found in CSV. Please ensure your CSV has firstName, lastName, and email columns.' 
      }, { status: 400 });
    }

    // Check for duplicate emails
    const emails = contactsData.map(c => c.email);
    const existingContacts = await Contact.find({ 
      email: { $in: emails }, 
      userId 
    });
    
    const existingEmails = new Set(existingContacts.map(c => c.email));
    const newContacts = contactsData.filter(c => !existingEmails.has(c.email));

    if (newContacts.length === 0) {
      return NextResponse.json({ 
        message: 'All contacts already exist in your address book.' 
      }, { status: 400 });
    }

    // Add userId to all contacts
    const contactsToInsert = newContacts.map(contact => ({
      ...contact,
      userId
    }));

    // Bulk insert
    const insertedContacts = await Contact.insertMany(contactsToInsert);

    return NextResponse.json({
      message: `Successfully imported ${insertedContacts.length} contacts`,
      imported: insertedContacts.length,
      skipped: contactsData.length - insertedContacts.length,
      contacts: insertedContacts
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ 
      message: 'Failed to import contacts' 
    }, { status: 500 });
  }
}