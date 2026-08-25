import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { env } from '../config/env.js';

// AES-256-GCM envelope encryption for at-rest PII (driver bank account numbers, wallet
// numbers — see driver-bank-accounts.js). BANK_DETAILS_ENC_KEY is a 32-byte key, base64
// encoded in .env (`openssl rand -base64 32`). Ciphertext is stored as
// `<iv>:<authTag>:<encrypted>`, each base64, so it's a single text column with no extra
// schema — never store or log the plaintext or the key itself anywhere else.
const ALGORITHM = 'aes-256-gcm';

function getKey() {
  if (!env.BANK_DETAILS_ENC_KEY) {
    throw { statusCode: 503, message: 'Bank detail encryption is not configured (BANK_DETAILS_ENC_KEY missing)' };
  }
  const key = Buffer.from(env.BANK_DETAILS_ENC_KEY, 'base64');
  if (key.length !== 32) {
    throw { statusCode: 500, message: 'BANK_DETAILS_ENC_KEY must decode to exactly 32 bytes' };
  }
  return key;
}

export function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(ciphertext) {
  const [ivB64, authTagB64, encryptedB64] = String(ciphertext).split(':');
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw { statusCode: 500, message: 'Malformed ciphertext' };
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
