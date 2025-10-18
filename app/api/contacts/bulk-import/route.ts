import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import Contact from '@/models/Contact';
import { parseCSVToContacts } from '@/utils/csvParser';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();
    const contactsToImport = parseCSVToContacts(csvText);

    if (contactsToImport.length === 0) {
      return NextResponse.json({ message: 'No valid contacts found in CSV' }, { status: 400 });
    }

    const contacts = contactsToImport.map(c => ({ ...c, userId }));

    await Contact.insertMany(contacts);

    return NextResponse.json({ message: 'Contacts imported successfully' });
  } catch (error) {
    console.error('API Error in POST /api/contacts/bulk-import', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
