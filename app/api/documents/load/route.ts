import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { updateDocumentStatus } from '@/lib/statusLogic';

// GET - Load a document with its fields and recipients
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');
    console.log(`[LOAD] Attempting to load document with ID: ${documentId}`);

    if (!documentId) {
      return NextResponse.json({ message: 'Document ID missing' }, { status: 400 });
    }

    const document = await DocumentModel.findById(documentId);

    if (!document) {
      return NextResponse.json({ message: 'Document not found by ID' }, { status: 404 });
    }

    console.log(`[LOAD] DocUser ID: ${document.userId}, Type: ${typeof document.userId}`);
    console.log(`[LOAD] ReqUser ID: ${userId}, Type: ${typeof userId}`);

    // Correctly compare ObjectId with string
    const { searchParams: urlParams } = new URL(req.url);
    const guestId = urlParams.get('guestId');

    // Validate guestId: only accept guest IDs (must start with "guest_")
    // This prevents attackers from passing legitimate user IDs as guestId
    const isValidGuestId = guestId && guestId.startsWith('guest_');

    // If the document is a template, any authenticated user can load it.
    // Otherwise, check for ownership (creator or validated guest).
    const isOwner = document.userId.toString() === userId || 
                   (isValidGuestId && document.userId.toString() === guestId);
    
    if (!document.isTemplate && !isOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get the current version's fields
    const currentVersion = document.versions && document.versions.length > 0
      ? document.versions[document.currentVersion - 1]
      : null;

    const fields = currentVersion?.fields || [];

    console.log(`[LOAD] Returning ${fields.length} fields from version ${document.currentVersion}`);

    // Return document with fields from current version
    const responseDoc = {
      _id: document._id,
      documentId: document._id, // Add documentId for consistency
      documentName: document.documentName,
      originalFileName: document.originalFileName,
      currentVersion: document.currentVersion,
      recipients: document.recipients,
      status: document.status,
      fields: fields, // Fields from current version
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    return NextResponse.json({ success: true, document: responseDoc });
  } catch (error) {
    console.error('API Error in GET /api/documents/load', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
