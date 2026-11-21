import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function tokenSecret(): Buffer {
  const secret = process.env.TOKEN_HMAC_SECRET ?? '';
  if (secret.length < 16) {
    throw new Error('TOKEN_HMAC_SECRET is missing or too short');
  }
  return Buffer.from(secret, 'utf8');
}

/** Hash password with scrypt (salt + derived key encoded as hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Constant-time password verification. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
    return false;
  }
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Generate a high-entropy one-time token (32 bytes, base64url). */
export function generateSecurityToken(): string {
  return randomBytes(32).toString('base64url');
}

/** New random BINARY(16) id for the token row. */
export function newTokenId(): Buffer {
  return randomBytes(16);
}

/** HMAC-SHA256 digest of a raw token (stored in DB, never the raw value). */
export function hashSecurityToken(rawToken: string): Buffer {
  return createHmac('sha256', tokenSecret()).update(rawToken, 'utf8').digest();
}

function recoverySecret(): Buffer {
  const secret = process.env.RECOVERY_KEY_HMAC_SECRET ?? '';
  if (secret.length < 16) {
    throw new Error('RECOVERY_KEY_HMAC_SECRET is missing or too short');
  }
  return Buffer.from(secret, 'utf8');
}

/** Generate a long-lived Security Recovery Key (32 bytes, base64url). */
export function generateRecoveryKey(): string {
  return randomBytes(32).toString('base64url');
}

/** HMAC-SHA256 digest of a raw Recovery Key. */
export function hashRecoveryKey(rawKey: string): Buffer {
  return createHmac('sha256', recoverySecret()).update(rawKey, 'utf8').digest();
}

/** Constant-time comparison of two digests. */
export function recoveryKeyMatches(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** SHA-256 digest of an opaque session token (raw token is the secret). */
export function hashSessionToken(rawToken: string): Buffer {
  return createHash('sha256').update(rawToken, 'utf8').digest();
}

/** Constant-time comparison of two token digests. */
export function tokenDigestMatches(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
