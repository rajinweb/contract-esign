import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import Contact from '@/models/Contact';

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    const { contactIds } = await req.json();

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ message: 'No contact IDs provided' }, { status: 400 });
    }

    await Contact.deleteMany({ _id: { $in: contactIds }, userId });

    return NextResponse.json({ message: 'Contacts deleted successfully' });
  } catch (error) {
    console.error('API Error in DELETE /api/contacts/bulk-delete', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
