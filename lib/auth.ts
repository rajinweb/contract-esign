import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// ---------------- JWT Helper ----------------
export async function getUserIdFromReq(req: NextRequest): Promise<string | null> {
  // Try Authorization header first
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  // Then check cookies
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|; )token=([^;]+)/);
  const token = bearer || (match ? decodeURIComponent(match[1]) : null);

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as JwtPayload & { id?: string };
    return decoded?.id || null;
  } catch (err) {
    console.warn("Invalid JWT:", err);
    return null;
  }
}
