import mongoose, { Schema, model } from 'mongoose';
import { IDocument } from '@/types/types';

// Mongoose schema
const DocumentSchema = new Schema<IDocument>(
    {
        token: { type: String, required: true, unique: true },
        pdfData: { type: Buffer, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Create or reuse the model
const DocumentModel = mongoose.models.Document || model<IDocument>('Document', DocumentSchema);

export default DocumentModel;
