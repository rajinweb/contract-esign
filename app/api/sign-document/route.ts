// app/api/sign-document/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { recipientId, documentName, token } = await req.json();

        // TODO: Verify the token and recipientId
        // TODO: Save signature in DB for this recipient & document
        console.log('Signing document:', { recipientId, documentName, token });

        return NextResponse.json({ success: true, message: 'Document signed' });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: 'Failed to sign document' }, { status: 500 });
    }
}
