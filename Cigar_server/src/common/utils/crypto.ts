import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const AES_256_GCM = 'aes-256-gcm';
const AES_128_CBC = 'aes-128-cbc';
const IV_LENGTH_GCM = 12;
const IV_LENGTH_CBC = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env['ENCRYPTION_KEY'];
  if (!raw) throw new Error('ENCRYPTION_KEY 未配置');
  return scryptSync(raw, 'cigarpro-salt', 32);
}

export function encryptPhone(phone: string): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_GCM);
  const cipher = createCipheriv(AES_256_GCM, key, iv);
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptPhone(encrypted: Buffer): string {
  const key = getEncryptionKey();
  const iv = encrypted.subarray(0, IV_LENGTH_GCM);
  const tag = encrypted.subarray(IV_LENGTH_GCM, IV_LENGTH_GCM + TAG_LENGTH);
  const data = encrypted.subarray(IV_LENGTH_GCM + TAG_LENGTH);
  const decipher = createDecipheriv(AES_256_GCM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function wechatDecrypt(
  encryptedData: string,
  iv: string,
  sessionKey: string,
): Record<string, unknown> {
  const key = Buffer.from(sessionKey, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const decipher = createDecipheriv(AES_128_CBC, key, ivBuffer);
  decipher.setAutoPadding(true);
  const decoded = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decoded.toString('utf8'));
}

export function maskPhone(phone: string): string {
  if (phone.length === 11) {
    return phone.slice(0, 3) + '****' + phone.slice(7);
  }
  return phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2');
}
