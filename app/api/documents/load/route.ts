import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';


// GET - Load a document with its fields and recipients
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    const { searchParams } = new URL(req.url);
    const signingToken = searchParams.get('token') || req.headers.get('X-Signing-Token');

    const documentId = searchParams.get('id');
    console.log(`[LOAD] Attempting to load document with ID: ${documentId}`);

    if (!documentId) {
      return NextResponse.json({ message: 'Document ID missing' }, { status: 400 });
    }

    const document = await DocumentModel.findById(documentId);

    if (!document) {
      return NextResponse.json({ message: 'Document not found by ID' }, { status: 404 });
    }

    let authorized = false;

    if (signingToken) {
      // Check if any version has this signing token
      const hasToken = document.versions.some((v: any) => v.signingToken === signingToken);
      if (hasToken) {
        authorized = true;
      }
    }

    if (!authorized && userId) {
      console.log(`[LOAD] DocUser ID: ${document.userId}, Type: ${typeof document.userId}`);
      console.log(`[LOAD] ReqUser ID: ${userId}, Type: ${typeof userId}`);

    const guestId = searchParams.get('guestId');
    const isValidGuestId = guestId && guestId.startsWith('guest_');

      // If the document is a template, any authenticated user can load it.
      // Otherwise, check for ownership (creator or validated guest).
      if (document.isTemplate ||
        document.userId.toString() === userId ||
        (isValidGuestId && document.userId.toString() === guestId)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
