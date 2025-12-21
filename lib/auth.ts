import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// ---------------- JWT Helper ----------------
export async function getUserIdFromReq(req: NextRequest): Promise<string | null> {
  // Try Authorization header first (JWT takes precedence for security)
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  // Then check cookies
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|; )token=([^;]+)/);
  const token = bearer || (match ? decodeURIComponent(match[1]) : null);

  // If we have a valid JWT token, use it (prevents guestId URL manipulation)
  if (token) {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret) as JwtPayload & { id?: string };
        if (decoded?.id) {
          return decoded.id;
        }
      } catch (err) {
        // Invalid JWT, fall through to guestId check
      }
    }
  }

  // Only check for guestId if no valid JWT token was found
  // This allows guest access but prevents JWT bypass via URL manipulation
  // IMPORTANT: Validate guestId format to prevent user ID spoofing
  // Guest IDs must start with "guest_" prefix - reject any other format
  const url = new URL(req.url);
  const guestId = url.searchParams.get('guestId');
  if (guestId) {
    // Only accept guest IDs that start with "guest_" prefix
    // This prevents attackers from passing legitimate user IDs as guestId
    if (guestId.startsWith('guest_')) {
      return guestId;
    }
    // Invalid format - reject it to prevent user ID spoofing
    return null;
  }

  return null;
}
