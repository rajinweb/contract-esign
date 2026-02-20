import { randomUUID } from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export interface AccessTokenPayload {
  userId: string;
  role: string;
  tokenVersion: number;
  sessionId: string;
  authTime: number;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  sessionId: string;
  authTime: number;
  nonce: string;
  type: 'refresh';
}

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'contract-esign';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'contract-esign-app';

class InvalidPemKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPemKeyError';
  }
}

const keyCache = new Map<string, string>();

function normalizePem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('BEGIN')) {
    return trimmed.replace(/\\n/g, '\n');
  }

  const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
  if (decoded.includes('BEGIN')) {
    return decoded;
  }

  throw new InvalidPemKeyError('Unable to decode PEM key from environment variable.');
}

function readPemFromEnv(names: string[]): string {
  const cacheKey = names.join(',');
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  for (const name of names) {
    const value = process.env[name];
    if (!value) continue;
    const key = normalizePem(value);
    keyCache.set(cacheKey, key);
    return key;
  }

  throw new Error(`Missing JWT key material. Expected one of: ${names.join(', ')}`);
}

function getAccessPrivateKey(): string {
  return readPemFromEnv(['JWT_ACCESS_PRIVATE_KEY', 'JWT_PRIVATE_KEY']);
}

function getAccessPublicKey(): string {
  return readPemFromEnv(['JWT_ACCESS_PUBLIC_KEY', 'JWT_PUBLIC_KEY']);
}

function getRefreshPrivateKey(): string {
  return readPemFromEnv(['JWT_REFRESH_PRIVATE_KEY', 'JWT_PRIVATE_KEY']);
}

function getRefreshPublicKey(): string {
  return readPemFromEnv(['JWT_REFRESH_PUBLIC_KEY', 'JWT_PUBLIC_KEY']);
}

export function isJwtConfigurationError(error: unknown): boolean {
  if (error instanceof InvalidPemKeyError) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message || '';
  return (
    message.includes('Missing JWT key material') ||
    message.includes('Unable to decode PEM key from environment variable')
  );
}

function verifyAndCoerce<T extends { type: string }>(
  token: string,
  publicKey: string,
  expectedType: T['type']
): T {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload & T;

  if (decoded.type !== expectedType) {
    throw new Error(`Invalid token type. Expected ${expectedType}.`);
  }

  return decoded as T;
}

function signToken(payload: object, privateKey: string, expiresIn: SignOptions['expiresIn']): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn,
    jwtid: randomUUID(),
  });
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return signToken(
    {
      ...payload,
      type: 'access',
    },
    getAccessPrivateKey(),
    parseDurationToMs(ACCESS_TOKEN_TTL) / 1000
  );
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type' | 'nonce'>): string {
  return signToken(
    {
      ...payload,
      nonce: randomUUID(),
      type: 'refresh',
    },
    getRefreshPrivateKey(),
    parseDurationToMs(REFRESH_TOKEN_TTL) / 1000
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return verifyAndCoerce<AccessTokenPayload>(token, getAccessPublicKey(), 'access');
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return verifyAndCoerce<RefreshTokenPayload>(token, getRefreshPublicKey(), 'refresh');
}

export function getAccessTokenTtl(): string {
  return ACCESS_TOKEN_TTL;
}

function parseDurationToMs(duration: string): number {
  const normalized = duration.trim();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    const asNumber = Number(normalized);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      return asNumber * 1000;
    }
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

export function getRefreshTokenExpiryDate(now = new Date()): Date {
  const ttlMs = parseDurationToMs(REFRESH_TOKEN_TTL);
  return new Date(now.getTime() + ttlMs);
}

