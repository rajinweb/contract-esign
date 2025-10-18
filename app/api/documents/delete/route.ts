import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import fs from 'fs';
import path from 'path';

// DELETE - Delete a document
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthSession(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ message: 'Document ID missing' }, { status: 400 });
    }

    const doc = await DocumentModel.findOne({ _id: documentId, userId });

    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Delete associated files from the filesystem
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

    await DocumentModel.deleteOne({ _id: documentId, userId });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('API Error in DELETE /api/documents/delete', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
