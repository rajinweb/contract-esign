import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const getRegion = () => process.env.AWS_REGION || 'us-east-1';
// Keep for backward compatibility
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({
  region: getRegion(),
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export async function putObjectStream(params: {
  bucket: string;
  key: string;
  body: Readable | Buffer | Uint8Array;
  contentType: string;
  contentLength?: number;
}): Promise<{ etag?: string }> {
  const cmd = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  try {
    const res = await s3.send(cmd);
    return { etag: res.ETag };
  } catch (error: any) {
    if (error.name === 'NoSuchBucket') {
      throw new Error(`S3 Bucket '${params.bucket}' does not exist in region '${getRegion()}'. Please create it.`);
    }
    throw error;
  }
}

export async function getObjectStream(params: { bucket: string; key: string; region?: string }) {
  const region = params.region || getRegion();
  let client = s3;
  if (region !== getRegion()) {
    client = new S3Client({
      region: region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }
  const cmd = new GetObjectCommand({ Bucket: params.bucket, Key: params.key });
  try {
    const res = await client.send(cmd);
    if (!res.Body) throw new Error('S3 object body is empty');
    // In AWS SDK v3, Body is a Readable stream in Node.js
    return res.Body as Readable;
  } catch (error: any) {
    if (error.name !== 'NoSuchKey') {
      console.error(`S3 GetObject Error: ${error.name} - ${error.message} (Bucket: ${params.bucket}, Key: ${params.key}, Region: ${region})`);
    }
    throw error;
  }
}

export async function deleteObject(params: { bucket: string; key: string; region?: string }) {
  const region = params.region || getRegion();
  let client = s3;
  if (region !== getRegion()) {
    client = new S3Client({
      region: region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }
  const cmd = new DeleteObjectCommand({ Bucket: params.bucket, Key: params.key });
  try {
    await client.send(cmd);
  } catch (error: any) {
    // It's generally safe to ignore NoSuchKey on delete, as the file is already gone.
    if (error.name !== 'NoSuchKey') {
      console.error(`S3 DeleteObject Error: ${error.name} - ${error.message} (Bucket: ${params.bucket}, Key: ${params.key}, Region: ${region})`);
      throw error;
    }
  }
}

export async function copyObject(params: {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
  region?: string;
}) {
  const region = params.region || getRegion();
  let client = s3;
  if (region !== getRegion()) {
    client = new S3Client({
      region: region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }
  const cmd = new CopyObjectCommand({
    Bucket: params.destinationBucket,
    CopySource: `${params.sourceBucket}/${params.sourceKey}`,
    Key: params.destinationKey,
  });
  try {
    await client.send(cmd);
  } catch (error: any) {
    console.error(`S3 CopyObject Error: ${error.name} - ${error.message} (Source: ${params.sourceBucket}/${params.sourceKey}, Dest: ${params.destinationBucket}/${params.destinationKey})`);
    throw error;
  }
}