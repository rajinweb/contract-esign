import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await req.json();
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ message: 'No document IDs provided' }, { status: 400 });
    }

    const documents = await DocumentModel.find({ _id: { $in: documentIds }, userId });

    if (documents.length === 0) {
      // This isn't an error, it just means no documents matched for this user.
      return NextResponse.json({ message: 'No matching documents found to delete' }, { status: 200 });
    }

    // Delete associated files from the filesystem
    for (const doc of documents) {
      if (doc.versions && doc.versions.length > 0) {
        for (const version of doc.versions) {
          if (version.filePath) {
            try {
              // Ensure the path is within the project's uploads directory
              const uploadsDir = path.join(process.cwd(), 'uploads');
              const absoluteFilePath = path.resolve(version.filePath);

              if (absoluteFilePath.startsWith(uploadsDir)) {
                if (fs.existsSync(absoluteFilePath)) {
                  fs.unlinkSync(absoluteFilePath);
                }
              } else {
                console.warn(`Attempted to delete a file outside of the uploads directory: ${version.filePath}`);
              }
            } catch (err) {
              console.error(`Failed to delete file ${version.filePath}:`, err);
              // Continue to delete the DB record even if file deletion fails
            }
          }
        }
      }
    }

    await DocumentModel.deleteMany({ _id: { $in: documentIds }, userId });

    return NextResponse.json({ message: 'Documents deleted successfully' });
  } catch (error) {
    console.error('API Error in POST /api/documents/bulk-delete', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}