import { safeStorage } from 'electron';

/**
 * Encrypt a plaintext string using Electron safeStorage.
 * Returns a base64-encoded string suitable for SQLite TEXT storage.
 */
export function encrypt(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system.');
  }
  const encrypted: Buffer = safeStorage.encryptString(plaintext);
  return encrypted.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string back to plaintext.
 */
export function decrypt(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system.');
  }
  const buffer = Buffer.from(encrypted, 'base64');
  return safeStorage.decryptString(buffer);
}
