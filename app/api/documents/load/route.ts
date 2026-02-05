import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import SignatureModel from '@/models/Signature';
import { getLatestPreparedVersion } from '@/lib/signing-utils';
import { sanitizeRecipients } from '@/lib/recipient-sanitizer';

function normalizeFieldOwner(field: any): 'me' | 'recipients' {
  const owner = String(field?.fieldOwner ?? '').toLowerCase();
  if (owner === 'me') return 'me';
  if (owner === 'recipient' || owner === 'recipients') return 'recipients';
  if (field?.recipientId) return 'recipients';
  return 'me';
}

function normalizeFields(fields: any[]) {
  if (!Array.isArray(fields)) return [];
  return fields.map((field) => {
    const plain = typeof field?.toObject === 'function' ? field.toObject() : { ...field };
    return {
      ...plain,
      fieldOwner: normalizeFieldOwner(plain),
    };
  });
}



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
      // Check if any recipient has this signing token
      const hasToken = document.recipients.some((r: any) => r.signingToken === signingToken);
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
    if (signingToken && document.deletedAt) {
      return NextResponse.json({ message: 'Document has been trashed.' }, { status: 410 });
    }

    // Get the current version's fields
    const preparedVersion = getLatestPreparedVersion(document.versions || []);
    let fields = normalizeFields(Array.isArray(preparedVersion?.fields) ? preparedVersion?.fields : []);

    const hasSignedRecipients = Array.isArray(document.recipients)
      ? document.recipients.some((r: any) => ['signed', 'approved'].includes(r.status))
      : false;
    const hasSigningEvents = Array.isArray(document.signingEvents) && document.signingEvents.length > 0;

    if (hasSignedRecipients || hasSigningEvents) {
      const allowedRecipientIds = signingToken
        ? document.recipients.filter((r: any) => r.signingToken === signingToken).map((r: any) => r.id)
        : document.recipients.map((r: any) => r.id);

      if (allowedRecipientIds.length > 0) {
        const signedFieldRecords = await SignatureModel.find({
          documentId: document._id,
          recipientId: { $in: allowedRecipientIds },
        }).lean();

        const fieldValueMap = new Map<string, { value: string; version: number; signedAt: number }>();
        for (const record of signedFieldRecords) {
          const fieldId = String((record as any).fieldId ?? '');
          if (!fieldId) continue;
          const version = typeof (record as any).version === 'number' ? (record as any).version : -1;
          const signedAt = (record as any).signedAt ? new Date((record as any).signedAt).getTime() : 0;
          const existing = fieldValueMap.get(fieldId);
          if (!existing || version > existing.version || (version === existing.version && signedAt > existing.signedAt)) {
            fieldValueMap.set(fieldId, {
              value: String((record as any).fieldValue ?? ''),
              version,
              signedAt,
            });
          }
        }

        if (fieldValueMap.size > 0) {
          fields = fields.map((field: any) => {
            const signedValue = fieldValueMap.get(String(field?.id ?? ''));
            if (!signedValue) return field;
            return { ...field, value: signedValue.value };
          });
        }
      }
    }

    console.log(`[LOAD] Returning ${fields.length} fields from prepared version ${preparedVersion?.version ?? 'unknown'}`);

    // Return document with fields from current version
    const safeRecipients = sanitizeRecipients(document.recipients || []);
    const responseDoc = {
      _id: document._id,
      documentId: document._id, // Add documentId for consistency
      documentName: document.documentName,
      originalFileName: document.originalFileName,
      currentVersion: document.currentVersion,
      derivedFromDocumentId: document.derivedFromDocumentId ?? null,
      derivedFromVersion: document.derivedFromVersion ?? null,
      recipients: safeRecipients,
      status: document.status,
      fields: fields, // Fields from current version
      signingEvents: document.signingEvents ?? [],
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    return NextResponse.json({ success: true, document: responseDoc });
  } catch (error) {
    console.error('API Error in GET /api/documents/load', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
