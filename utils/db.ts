import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import mongoose, { Schema, Document } from 'mongoose';
import DocumentModel from '@/models/Document';
import { IDocument } from '@/types/types';

const uri = process.env.MONGODB_URI;
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return; // Use existing connection
    }
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;

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
// ---------------- Fetch document by token ----------------
export async function getDocumentByToken(token: string): Promise<IDocument | null> {
  return DocumentModel.findOne({ token }).exec();
}
