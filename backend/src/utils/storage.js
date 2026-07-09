import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env, isS3Configured } from '../config/env.js';

const UPLOAD_URL_TTL_SECONDS = 300;   // 5 minutes to complete the PUT
const VIEW_URL_TTL_SECONDS   = 600;   // 10 minutes for admin document review

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let _client = null;

function s3() {
  if (_client) return _client;
  if (!isS3Configured) {
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

const EXT_TO_MIME = Object.fromEntries(Object.entries(ALLOWED_CONTENT_TYPES).map(([mime, ext]) => [ext, mime]));

function localBaseUrl() {
  return (env.APP_BASE_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '');
}

function localDevStorageUrl(key) {
  return `${localBaseUrl()}/api/${env.API_VERSION}/dev-storage/${key}`;
}

/** Resolves `key` inside UPLOAD_DIR, throwing if it would escape it (path traversal). */
function resolveLocalPath(key) {
  const resolved = path.resolve(UPLOAD_DIR, key);
  if (resolved !== UPLOAD_DIR && !resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw { statusCode: 400, message: 'Invalid file key' };
  }
  return resolved;
}

/** Used only by the local dev-storage route (see modules/dev-storage) when S3 isn't configured. */
export async function saveLocalObject(key, buffer) {
  const filePath = resolveLocalPath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

/** Used only by the local dev-storage route (see modules/dev-storage) when S3 isn't configured. */
export async function readLocalObject(key) {
  const filePath = resolveLocalPath(key);
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return { buffer, contentType: EXT_TO_MIME[ext] || 'application/octet-stream' };
  } catch (err) {
    if (err.statusCode) throw err;
    throw { statusCode: 404, message: 'File not found' };
  }
}

/**
 * Issue a presigned PUT URL for a client to upload a file directly to S3.
 * `folder` groups the object key (e.g. `driver-documents/{driverId}/{documentTypeId}`).
 *
 * When S3 isn't configured, returns a URL to the local dev-storage endpoint instead —
 * same contract (client PUTs raw bytes to `uploadUrl`), so callers don't need to care.
 */
export async function createUploadUrl(folder, contentType, maxFileSizeMb = 10) {
  const ext = ALLOWED_CONTENT_TYPES[contentType];
  if (!ext) throw { statusCode: 400, message: `Unsupported file type: ${contentType}` };

  const key = `${folder}/${randomUUID()}.${ext}`;

  if (!isS3Configured) {
    return { uploadUrl: localDevStorageUrl(key), key, expiresIn: UPLOAD_URL_TTL_SECONDS };
  }

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
  if (!isS3Configured) {
    try {
      const stat = await fs.stat(resolveLocalPath(key));
      if (stat.size > maxFileSizeMb * 1024 * 1024) {
        throw { statusCode: 400, message: 'Uploaded file exceeds the allowed size' };
      }
      return true;
    } catch (err) {
      if (err.statusCode) throw err;
      throw { statusCode: 400, message: 'Uploaded file not found — upload may have failed or expired' };
    }
  }

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
  if (!isS3Configured) return localDevStorageUrl(key);
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3(), command, { expiresIn: VIEW_URL_TTL_SECONDS });
}

export function keyToPublicUrl(key) {
  if (!key) return null;
  if (!isS3Configured) return localDevStorageUrl(key);
  if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return key;
}
