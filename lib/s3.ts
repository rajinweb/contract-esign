import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const getRegion = () => process.env.REGION_AWS || 'us-east-1';
// Keep for backward compatibility
export const REGION_AWS = process.env.REGION_AWS || 'us-east-1';

const s3 = new S3Client({
  region: getRegion(),
  credentials: process.env.ACCESS_AWS_KEY_ID && process.env.SECRET_AWS_ACCESS_KEY ? {
    accessKeyId: process.env.ACCESS_AWS_KEY_ID,
    secretAccessKey: process.env.SECRET_AWS_ACCESS_KEY,
  } : undefined,
});

function getErrorInfo(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'UnknownError', message: String(error) };
}

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
  } catch (error: unknown) {
    const err = getErrorInfo(error);
    if (err.name === 'NoSuchBucket') {
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
      credentials: process.env.ACCESS_AWS_KEY_ID && process.env.SECRET_AWS_ACCESS_KEY ? {
        accessKeyId: process.env.ACCESS_AWS_KEY_ID,
        secretAccessKey: process.env.SECRET_AWS_ACCESS_KEY,
      } : undefined,
    });
  }
  const cmd = new GetObjectCommand({ Bucket: params.bucket, Key: params.key });
  try {
    const res = await client.send(cmd);
    if (!res.Body) throw new Error('S3 object body is empty');
    // In AWS SDK v3, Body is a Readable stream in Node.js
    return res.Body as Readable;
  } catch (error: unknown) {
    const err = getErrorInfo(error);
    if (err.name !== 'NoSuchKey') {
      console.error(`S3 GetObject Error: ${err.name} - ${err.message} (Bucket: ${params.bucket}, Key: ${params.key}, Region: ${region})`);
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
      credentials: process.env.ACCESS_AWS_KEY_ID && process.env.SECRET_AWS_ACCESS_KEY ? {
        accessKeyId: process.env.ACCESS_AWS_KEY_ID,
        secretAccessKey: process.env.SECRET_AWS_ACCESS_KEY,
      } : undefined,
    });
  }
  const cmd = new DeleteObjectCommand({ Bucket: params.bucket, Key: params.key });
  try {
    await client.send(cmd);
  } catch (error: unknown) {
    const err = getErrorInfo(error);
    // It's generally safe to ignore NoSuchKey on delete, as the file is already gone.
    if (err.name !== 'NoSuchKey') {
      console.error(`S3 DeleteObject Error: ${err.name} - ${err.message} (Bucket: ${params.bucket}, Key: ${params.key}, Region: ${region})`);
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
      credentials: process.env.ACCESS_AWS_KEY_ID && process.env.SECRET_AWS_ACCESS_KEY ? {
        accessKeyId: process.env.ACCESS_AWS_KEY_ID,
        secretAccessKey: process.env.SECRET_AWS_ACCESS_KEY,
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
  } catch (error: unknown) {
    const err = getErrorInfo(error);
    console.error(`S3 CopyObject Error: ${err.name} - ${err.message} (Source: ${params.sourceBucket}/${params.sourceKey}, Dest: ${params.destinationBucket}/${params.destinationKey})`);
    throw error;
  }
}
