import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// AssetMap — Encryption Utilities
// AES-256-GCM for PII, SHA-256 for Aadhaar hashing
// ═══════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
  }
  return keyBuffer;
}

function getAadhaarSalt(): string {
  const salt = process.env.AADHAAR_SALT;
  if (!salt) {
    throw new Error('AADHAAR_SALT environment variable is not set');
  }
  return salt;
}

// ─────────────────────────────────────────────
// AES-256-GCM Encrypt / Decrypt
// ─────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptPII(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:ciphertext (all hex encoded)
 */
export function decryptPII(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ─────────────────────────────────────────────
// Aadhaar Hashing — SHA-256 with salt
// ─────────────────────────────────────────────

/**
 * Hash an Aadhaar number with SHA-256 + unique salt.
 * The raw Aadhaar number is NEVER stored.
 */
export function hashAadhaar(aadhaarNumber: string): string {
  const salt = getAadhaarSalt();
  const normalized = aadhaarNumber.replace(/\s/g, '');
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}

/**
 * Hash a phone number (E.164) with SHA-256 + salt for lookup.
 * The raw phone number is NEVER stored.
 */
export function hashMobile(phone: string): string {
  const salt = getAadhaarSalt();
  const normalized = phone.replace(/\s/g, '');
  return crypto.createHash('sha256').update(`${salt}:mobile:${normalized}`).digest('hex');
}

/**
 * Verify an Aadhaar number against a stored hash.
 */
export function verifyAadhaarHash(aadhaarNumber: string, storedHash: string): boolean {
  const computedHash = hashAadhaar(aadhaarNumber);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
}

// ─────────────────────────────────────────────
// Utility — hash arbitrary strings
// ─────────────────────────────────────────────

export function hashSHA256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
