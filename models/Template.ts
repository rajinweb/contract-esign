import mongoose, { Schema } from 'mongoose';
import { DocumentField } from '@/types/types';

export interface ITemplateField extends DocumentField {
    // Extends DocumentField with template-specific properties
    defaultValue?: string;
    helpText?: string;
}

export interface ITemplateDefaultSigner {
    name?: string;
    email?: string;
    role: 'signer' | 'approver' | 'viewer';
    order: number;
}

export interface ITemplate {
    _id?: string;
    userId: string; // owner, null for system templates
    name: string;
    description?: string;
    category: 'HR' | 'Legal' | 'Sales' | 'Finance' | 'Other';
    isSystemTemplate: boolean;
    templateFileUrl: string; // URL to the PDF template file
    thumbnailUrl?: string; // thumbnail/preview image
    fields: ITemplateField[]; // pre-configured fields
    defaultSigners?: ITemplateDefaultSigner[]; // pre-configured signers
    filePath: string; // path to the stored PDF file
    fileSize?: number;
    pageCount?: number;
    duplicateCount?: number; // track how many times this template has been used
    isActive: boolean;
    tags?: string[]; // for searching
    createdAt: Date;
    updatedAt: Date;
}

const TemplateFieldSchema = new Schema<ITemplateField>({
    id: { type: String, required: true },
    type: { type: String, required: true, enum: ['signature', 'text', 'date', 'checkbox', 'image', 'initials', 'live_photo', 'stamp'] },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    pageNumber: { type: Number, required: true },
    recipientId: { type: String },
    required: { type: Boolean, default: true },
    value: { type: String, default: '' },
    placeholder: { type: String },
    mimeType: { type: String },
    defaultValue: { type: String },
    helpText: { type: String },
});

const TemplateDefaultSignerSchema = new Schema<ITemplateDefaultSigner>({
    name: { type: String },
    email: { type: String },
    role: { type: String, enum: ['signer', 'approver', 'viewer'], default: 'signer' },
    order: { type: Number, required: true },
});

const TemplateSchema = new Schema<ITemplate>(
    {
        userId: { type: String, sparse: true }, // null for system templates
        name: { type: String, required: true },
        description: { type: String },
        category: { type: String, enum: ['HR', 'Legal', 'Sales', 'Finance', 'Other'], default: 'Other' },
        isSystemTemplate: { type: Boolean, default: false },
        templateFileUrl: { type: String, required: true },
        thumbnailUrl: { type: String },
        fields: { type: [TemplateFieldSchema], default: [] },
        defaultSigners: { type: [TemplateDefaultSignerSchema], default: [] },
        filePath: { type: String, required: true },
        fileSize: { type: Number },
        pageCount: { type: Number },
        duplicateCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        tags: { type: [String], default: [] },
    },
    { timestamps: true }
);

// Indexes for performance
TemplateSchema.index({ userId: 1, isSystemTemplate: 1 });
TemplateSchema.index({ category: 1 });
TemplateSchema.index({ isActive: 1 });
TemplateSchema.index({ tags: 1 });
TemplateSchema.index({ name: 'text', description: 'text' }); // text search

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
