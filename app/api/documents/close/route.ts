import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUserIdFromReq } from '@/utils/db';
import DocumentModel from '@/models/Document';

export const runtime = 'nodejs';

/**
 * Marks the current version of a document as 'final' or 'closed'.
 * This closes the current editing session. The next save operation will
 * then create a new document version (N+1).
 */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { documentId } = await req.json();

        if (!documentId) {
            return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
        }

        const existingDoc = await DocumentModel.findOne({ _id: documentId, userId });
        if (!existingDoc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

        // Find the index of the current working version
        const currentVersionIndex = existingDoc.versions.findIndex(v => v.version === existingDoc.currentVersion);
        const latestVersion = existingDoc.versions[currentVersionIndex];

        if (!latestVersion) {
            return NextResponse.json({ message: 'Current version data not found' }, { status: 404 });
        }

        // Only update if the status is currently 'draft' (i.e., open session)
        if (latestVersion.status === 'draft') {
            // Set the status to 'final' or 'closed'
            latestVersion.status = 'final';

            // Update the main document status as well
            existingDoc.status = 'final';
            existingDoc.updatedAt = new Date();

            await existingDoc.save();

            return NextResponse.json({
                success: true,
                message: `Document version ${existingDoc.currentVersion} finalized. New session required for next edit.`,
            });
        }

        // If it's already final, just return success
        return NextResponse.json({
            success: true,
            message: `Document version ${existingDoc.currentVersion} was already finalized.`,
        });

    } catch (error) {
        console.error('Error closing document session:', error);
        return NextResponse.json({ message: 'Failed to close document session' }, { status: 500 });
    }
}