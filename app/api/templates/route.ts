import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import Document from '@/models/Document';

export async function GET(req: NextRequest) {
    await connectDB();

    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const templates = await Document.find({ userId, isTemplate: true }).lean();

        return NextResponse.json(templates, { status: 200 });

    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({
            message: 'An internal server error occurred',
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
