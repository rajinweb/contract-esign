import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import mongoose, { Schema, model, models, Document } from 'mongoose';

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
export async function getUserIdFromReq(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|; )token=([^;]+)/);
  const token = bearer || (match ? decodeURIComponent(match[1]) : null);
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

// ---------------- MongoDB Document Schema ----------------
interface IDocument extends Document {
  token: string;
  pdfData: Buffer;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  token: { type: String, required: true, unique: true },
  pdfData: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Use existing model if available (Next.js hot reload fix)
const DocumentModel = models.Document || model<IDocument>('Document', DocumentSchema);

// ---------------- Fetch document by token ----------------
export async function getDocumentByToken(token: string) {
  await connectDB();
  const doc = await DocumentModel.findOne({ token }).lean();
  if (!doc) return null;
  return doc;
}
