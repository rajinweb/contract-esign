import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import Contact from '@/models/Contact';

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { contactIds } = await req.json();

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ message: 'Contact IDs are required' }, { status: 400 });
    }

    // Verify all contacts belong to the user before deletion
    const contactsToDelete = await Contact.find({
      _id: { $in: contactIds },
      userId
    });

    if (contactsToDelete.length !== contactIds.length) {
      return NextResponse.json({ 
        message: 'Some contacts not found or unauthorized' 
      }, { status: 404 });
    }

    // Delete the contacts
    const result = await Contact.deleteMany({
      _id: { $in: contactIds },
      userId
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} contacts`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ 
      message: 'Failed to delete contacts' 
    }, { status: 500 });
  }
}