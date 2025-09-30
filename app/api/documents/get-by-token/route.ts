import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../utils/db';
import DocumentModel from '../../../../models/Document';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const recipientId = searchParams.get('recipient');

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    const document = await DocumentModel.findOne({
      'versions.signingToken': token
    });

    if (!document) {
      return NextResponse.json({ message: 'Invalid or expired signing link' }, { status: 404 });
    }

    const version = document.versions.find((v: { signingToken?: string }) => v.signingToken === token);
    if (!version) {
      return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    }

    // Check if document has expired
    if (version.expiresAt && new Date() > version.expiresAt) {
      return NextResponse.json({ message: 'Document has expired' }, { status: 410 });
    }

    // Find recipient if specified
    let recipient = null;
    if (recipientId) {
      recipient = (document.recipients as Array<{ id: string }>).find((r) => r.id === recipientId);
      if (!recipient) {
        return NextResponse.json({ message: 'Recipient not found' }, { status: 404 });
      }
    }

    // Return document metadata (not the PDF data for this endpoint)
    return NextResponse.json({
      success: true,
      document: {
        id: document._id,
        name: document.documentName,
        version: version.version,
        status: version.status,
        expiresAt: version.expiresAt,
        fields: version.fields,
        recipients: document.recipients,
        currentRecipient: recipient,
      }
    });

  } catch (_err) {
    console.error('Error fetching document:', _err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}