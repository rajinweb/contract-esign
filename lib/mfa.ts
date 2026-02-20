import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
let warnedMissingMfaKey = false;

function normalizeBase32(input: string): string {
  return input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
}

function base32Encode(buffer: Buffer): string {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
}

function base32Decode(secret: string): Buffer {
  const normalized = normalizeBase32(secret);
  let bits = '';

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid Base32 character in TOTP secret.');
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function getDevFallbackKey(): Buffer {
  const seed =
    process.env.MFA_DEV_FALLBACK_SEED ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    'contract-esign-dev-mfa-fallback-key';
  return createHash('sha256').update(seed).digest();
}

function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV !== 'production') {
      if (!warnedMissingMfaKey) {
        warnedMissingMfaKey = true;
        console.warn(
          'MFA_ENCRYPTION_KEY is not set. Using deterministic dev fallback key; configure MFA_ENCRYPTION_KEY for production.'
        );
      }
      return getDevFallbackKey();
    }
    throw new Error('MFA_ENCRYPTION_KEY is required for MFA secret encryption.');
  }

  const trimmed = raw.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const asBase64 = Buffer.from(trimmed, 'base64');
  if (asBase64.length === 32) {
    return asBase64;
  }

  if (trimmed.length === 32) {
    return Buffer.from(trimmed, 'utf-8');
  }

  throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes (hex/base64/plain).');
}

export function isMfaConfigurationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes('MFA_ENCRYPTION_KEY is required for MFA secret encryption') ||
    error.message.includes('MFA_ENCRYPTION_KEY must be 32 bytes')
  );
}

export function generateMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

export function encryptMfaSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptMfaSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const payload = Buffer.from(encryptedSecret, 'base64url');

  if (payload.length < 28) {
    throw new Error('Encrypted MFA secret is invalid.');
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  const decoded = base32Decode(secret);
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  return hotp(decoded, counter, TOTP_DIGITS);
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyTotpCode(
  encryptedSecret: string,
  candidateCode: string,
  window = 1,
  now = Date.now()
): boolean {
  if (!/^\d{6}$/.test(candidateCode)) {
    return false;
  }

  const secret = decryptMfaSecret(encryptedSecret);
  const decoded = base32Decode(secret);
  const currentCounter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);

  for (let offset = -window; offset <= window; offset += 1) {
    const code = hotp(decoded, currentCounter + offset, TOTP_DIGITS);
    if (safeCompare(code, candidateCode)) {
      return true;
    }
  }

  return false;
}

export function buildTotpOtpAuthUrl(email: string, secret: string, issuer = 'Contract eSign'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(email.toLowerCase());
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
