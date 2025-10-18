import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import DocumentModel from '@/models/Document';
import { IDocument } from '@/types/types';

const uri = process.env.MONGODB_URI;

async function fixDocumentIndexes() {
  try {
    const collection = mongoose.connection.collection('documents');
    const indexes = await collection.indexes();

    const tokenIndex = indexes.find(idx => idx.name === 'token_1');

    if (tokenIndex && !tokenIndex.sparse) {
      console.log('Fixing token index - dropping old non-sparse index...');
      await collection.dropIndex('token_1');
      console.log('Creating new sparse index for token field...');
      await collection.createIndex({ token: 1 }, { unique: true, sparse: true });
      console.log('Token index fixed successfully');
    }
  } catch (error) {
    console.error('Error fixing document indexes:', error);
  }
}

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');

    await fixDocumentIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default connectDB;

