import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

const UPLOAD_URL_TTL_SECONDS = 300;   // 5 minutes to complete the PUT
const VIEW_URL_TTL_SECONDS   = 600;   // 10 minutes for admin document review

let _client = null;

function s3() {
  if (_client) return _client;
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
    throw { statusCode: 500, message: 'File storage is not configured' };
  }
  _client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: 'auto',
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    forcePathStyle: true, // required for MinIO / most S3-compatible providers
  });
  return _client;
}

const ALLOWED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Issue a presigned PUT URL for a client to upload a file directly to S3.
 * `folder` groups the object key (e.g. `driver-documents/{driverId}/{documentTypeId}`).
 */
export async function createUploadUrl(folder, contentType, maxFileSizeMb = 10) {
  const ext = ALLOWED_CONTENT_TYPES[contentType];
  if (!ext) throw { statusCode: 400, message: `Unsupported file type: ${contentType}` };

  const key = `${folder}/${randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: maxFileSizeMb * 1024 * 1024, // presigned exact-length constraint; client must match
  });
  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { uploadUrl, key, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

/** Confirm an object actually exists in the bucket (called before trusting a client's "done" signal). */
export async function verifyObjectExists(key, maxFileSizeMb = 10) {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    if (head.ContentLength > maxFileSizeMb * 1024 * 1024) {
      throw { statusCode: 400, message: 'Uploaded file exceeds the allowed size' };
    }
    return true;
  } catch (err) {
    if (err.statusCode) throw err;
    throw { statusCode: 400, message: 'Uploaded file not found — upload may have failed or expired' };
  }
}

/** Short-lived signed GET URL for admin document review (private bucket). */
export async function createViewUrl(key) {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3(), command, { expiresIn: VIEW_URL_TTL_SECONDS });
}

export function keyToPublicUrl(key) {
  if (!key) return null;
  if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return key;
}
