import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import {
  clearAuthTokenCookie,
  clearCsrfCookie,
  clearRefreshTokenCookie,
  hashRefreshToken,
  issueCsrfToken,
  setCsrfCookie,
  setRefreshTokenCookie,
} from '@/lib/auth';
import {
  getAccessTokenTtl,
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
} from '@/lib/jwt';
import SessionModel from '@/models/Session';
import UserModel from '@/models/Users';

export interface SafeAuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  name: string;
  picture: string;
}

interface UserShape {
  _id: unknown;
  email: string;
  role: string;
  tokenVersion: number;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

interface IssueSessionInput {
  user: UserShape;
  deviceInfo?: string;
  ipAddress: string;
  userAgent: string;
  authTimeSeconds?: number;
}

export function toSafeAuthUser(user: {
  _id: unknown;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}): SafeAuthUser {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    picture: user.picture || '',
  };
}

export function clearAllAuthCookies(response: NextResponse): void {
  clearAuthTokenCookie(response);
  clearRefreshTokenCookie(response);
  clearCsrfCookie(response);
}

export function applyAuthSessionCookies(
  response: NextResponse,
  refreshToken: string,
  refreshExpiresAt: Date
): void {
  clearAuthTokenCookie(response);
  setRefreshTokenCookie(response, refreshToken, refreshExpiresAt);
  setCsrfCookie(response, issueCsrfToken());
}

export async function issueSessionForUser(input: IssueSessionInput): Promise<{
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  accessTokenTtl: string;
  safeUser: SafeAuthUser;
}> {
  const nowSeconds = input.authTimeSeconds ?? Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();

  const accessToken = signAccessToken({
    userId: String(input.user._id),
    role: input.user.role,
    tokenVersion: input.user.tokenVersion,
    sessionId,
    authTime: nowSeconds,
  });

  const refreshToken = signRefreshToken({
    userId: String(input.user._id),
    tokenVersion: input.user.tokenVersion,
    sessionId,
    authTime: nowSeconds,
  });

  const refreshExpiresAt = getRefreshTokenExpiryDate();

  await SessionModel.create({
    _id: sessionId,
    userId: input.user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    deviceInfo: input.deviceInfo || '',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    expiresAt: refreshExpiresAt,
    revoked: false,
  });

  return {
    sessionId,
    accessToken,
    refreshToken,
    refreshExpiresAt,
    accessTokenTtl: getAccessTokenTtl(),
    safeUser: toSafeAuthUser(input.user),
  };
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  await SessionModel.updateOne({ _id: sessionId }, { $set: { revoked: true } }).exec();
}

export async function revokeAllUserSessionsAndBumpTokenVersion(userId: string): Promise<void> {
  await SessionModel.updateMany({ userId }, { $set: { revoked: true } }).exec();
  await UserModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }).exec();
}

export async function softDeleteUserAndRevokeSessions(userId: string): Promise<void> {
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        isDeleted: true,
        isActive: false,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
      $inc: {
        tokenVersion: 1,
      },
    }
  ).exec();

  await SessionModel.updateMany({ userId }, { $set: { revoked: true } }).exec();
}
