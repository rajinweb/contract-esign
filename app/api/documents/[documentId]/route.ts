import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import DocumentModel from '@/models/Document';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getLatestPreparedVersion } from '@/lib/signing-utils';

export const runtime = 'nodejs';

const s3 = new S3Client({
  region: process.env.REGION_AWS || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_AWS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_AWS_ACCESS_KEY || '',
  },
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const params = await props.params;
    const { documentId } = params;

    const userId = await getAuthSession(req, { allowGuest: true });
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    let document;

    // 1. Try to find by recipient token if provided
    if (token) {
      document = await DocumentModel.findOne({
        _id: documentId,
        'recipients.signingToken': token
      });
    }

    // 2. If not found by token, try to find by userId (owner).
    // `userId` is already resolved from JWT or validated guestId via getAuthSession().
    if (!document && userId) {
      document = await DocumentModel.findOne({
        _id: documentId,
        userId
      });
    }

    if (!document) {
      return NextResponse.json({ message: 'Document not found or unauthorized' }, { status: 404 });
    }
    if (token && document.deletedAt) {
      return NextResponse.json({ message: 'Document has been trashed.' }, { status: 410 });
    }

    // 3. Determine Version
    let versionNumber = document.currentVersion;
    const versionParam = url.searchParams.get('version');

    if (token) {
      const preparedVersion = getLatestPreparedVersion(document.versions || []);
      if (!preparedVersion) {
        return NextResponse.json({ message: 'Prepared version not found' }, { status: 404 });
      }
      versionNumber = preparedVersion.version;
    } else if (versionParam) {
      versionNumber = parseInt(versionParam, 10);
    }

    const versionData = document.versions.find((v: any) => v.version === versionNumber);

    if (!versionData) {
      return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    }

    const bucket = versionData.storage?.bucket || process.env.S3_BUCKET_NAME;
    const key = versionData.storage?.key;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const s3Response = await s3.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ message: 'File not found in storage' }, { status: 404 });
    }

    const fileBody = await s3Response.Body.transformToByteArray();

    return new NextResponse(fileBody as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
