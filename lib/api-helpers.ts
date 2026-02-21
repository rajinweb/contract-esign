import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

import connectDB from '@/utils/db';
import { getAccessTokenFromRequest, getGuestIdFromReq, hashRefreshToken, REFRESH_TOKEN_COOKIE_NAME } from '@/lib/auth';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/jwt';
import { isUserAllowed } from '@/lib/user-status';
import SessionModel from '@/models/Session';
import UserModel from '@/models/Users';

interface AuthSessionOptions {
  allowGuest?: boolean;
}

interface ActiveUserProjection {
  _id: mongoose.Types.ObjectId;
  tokenVersion: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

async function resolveActiveUser(userId: string): Promise<ActiveUserProjection | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await UserModel.findById(userId)
    .select('_id tokenVersion isActive isDeleted')
    .lean<ActiveUserProjection | null>();

  if (!isUserAllowed(user)) {
    return null;
  }

  return user;
}

async function resolveUserIdFromAccessToken(req: NextRequest): Promise<string | null> {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) {
    return null;
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    return null;
  }

  const user = await resolveActiveUser(payload.userId);
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  const session = await SessionModel.findById(payload.sessionId)
    .select('userId revoked expiresAt')
    .lean<{ userId: mongoose.Types.ObjectId; revoked: boolean; expiresAt: Date } | null>();

  if (
    !session ||
    session.revoked ||
    session.userId.toString() !== payload.userId ||
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    return null;
  }

  return payload.userId;
}

/**
 * Connects to the database and retrieves the user ID from the request.
 * This function is designed to be called at the beginning of an API route handler.
 * It encapsulates the database connection and user authentication logic.
 * @param req The NextRequest object.
 * @returns A promise that resolves to the user ID (string) or null if not authenticated.
 * @throws Will throw an error if the database connection fails.
 */
export async function getAuthSession(
  req: NextRequest,
  options: AuthSessionOptions = {}
): Promise<string | null> {
  await connectDB();
  try {
    // 1) Try bearer access token from Authorization header
    const accessUserId = await resolveUserIdFromAccessToken(req);
    if (accessUserId) {
      return accessUserId;
    }

    // 2) Fallback: try refresh token from cookie to keep user logged in across reloads
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
    if (refreshToken) {
      const refreshUserId = await getAuthenticatedUserIdFromRefreshToken(refreshToken);
      if (refreshUserId) {
        return refreshUserId;
      }
    }

    // 3) Optionally allow guest access when enabled
    return options.allowGuest ? getGuestIdFromReq(req) : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserIdFromRefreshToken(
  refreshToken: string | null | undefined
): Promise<string | null> {
  if (!refreshToken) {
    return null;
  }

  await connectDB();

  try {
    const payload = verifyRefreshToken(refreshToken);
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const session = await SessionModel.findById(payload.sessionId)
      .select('userId refreshTokenHash revoked expiresAt')
      .lean<{
        userId: mongoose.Types.ObjectId;
        refreshTokenHash: string;
        revoked: boolean;
        expiresAt: Date;
      } | null>();

    if (
      !session ||
      session.refreshTokenHash !== refreshTokenHash ||
      session.revoked ||
      session.userId.toString() !== payload.userId ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      return null;
    }

    const user = await resolveActiveUser(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}
