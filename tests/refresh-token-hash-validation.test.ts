import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthenticatedUserIdFromRefreshToken } from '../lib/api-helpers';

const {
  verifyRefreshTokenMock,
  hashRefreshTokenMock,
  sessionFindByIdMock,
  userFindByIdMock,
  connectDbMock,
} = vi.hoisted(() => ({
  verifyRefreshTokenMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  sessionFindByIdMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  connectDbMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/db', () => ({
  __esModule: true,
  default: connectDbMock,
}));

vi.mock('@/lib/jwt', () => ({
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: verifyRefreshTokenMock,
}));

vi.mock('@/lib/auth', () => ({
  getAccessTokenFromRequest: vi.fn(),
  getGuestIdFromReq: vi.fn(),
  hashRefreshToken: hashRefreshTokenMock,
}));

vi.mock('@/models/Session', () => ({
  __esModule: true,
  default: {
    findById: sessionFindByIdMock,
  },
}));

vi.mock('@/models/Users', () => ({
  __esModule: true,
  default: {
    findById: userFindByIdMock,
  },
}));

function mockSelectLean<T>(value: T) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

describe('refresh token hash validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects refresh tokens that do not match stored session hash', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    verifyRefreshTokenMock.mockReturnValue({
      userId,
      tokenVersion: 1,
      sessionId: 'session-1',
      authTime: Math.floor(Date.now() / 1000),
      nonce: 'nonce-1',
      type: 'refresh',
    });
    hashRefreshTokenMock.mockReturnValue('hash-from-cookie');
    sessionFindByIdMock.mockReturnValue(
      mockSelectLean({
        userId: new mongoose.Types.ObjectId(userId),
        refreshTokenHash: 'different-hash',
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      })
    );

    const result = await getAuthenticatedUserIdFromRefreshToken('refresh-token');

    expect(result).toBeNull();
    expect(userFindByIdMock).not.toHaveBeenCalled();
  });

  it('accepts refresh tokens when stored session hash and user status are valid', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    verifyRefreshTokenMock.mockReturnValue({
      userId,
      tokenVersion: 3,
      sessionId: 'session-2',
      authTime: Math.floor(Date.now() / 1000),
      nonce: 'nonce-2',
      type: 'refresh',
    });
    hashRefreshTokenMock.mockReturnValue('matching-hash');
    sessionFindByIdMock.mockReturnValue(
      mockSelectLean({
        userId: new mongoose.Types.ObjectId(userId),
        refreshTokenHash: 'matching-hash',
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      })
    );
    userFindByIdMock.mockReturnValue(
      mockSelectLean({
        _id: new mongoose.Types.ObjectId(userId),
        tokenVersion: 3,
        isActive: true,
        isDeleted: false,
      })
    );

    const result = await getAuthenticatedUserIdFromRefreshToken('refresh-token');

    expect(result).toBe(userId);
  });
});
