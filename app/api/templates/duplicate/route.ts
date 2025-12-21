import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import connectDB from '@/utils/db';
import Template from '@/models/Template';
import Document from '@/models/Document';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    await connectDB();
    const userId = await getAuthSession(req);

    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { templateId } = await req.json();

        if (!templateId) {
            return NextResponse.json({ message: 'Template ID is required' }, { status: 400 });
        }

        const originalTemplate = await Template.findById(templateId);

        if (!originalTemplate) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        const newTemplate = new Template({
            ...originalTemplate.toObject(),
            _id: undefined, // Let MongoDB generate a new ID
            name: `${originalTemplate.name} (Copy)`,
            isSystemTemplate: false, // Duplicated templates are user templates
            userId: userId,
            createdAt: new Date(),
        });

        // Handle copying the associated PDF file
        let originalFileAbsolutePath: string | null = null;

        // Strategy 1: Try the stored filePath directly
        if (originalTemplate.filePath) {
            const safePath = path.normalize(originalTemplate.filePath).replace(/^(\.\.[\/\\])+/, '');
            const candidatePath = path.join(process.cwd(), safePath);
            
            if (fs.existsSync(candidatePath)) {
                originalFileAbsolutePath = candidatePath;
                console.log(`[DUPLICATE TEMPLATE] Strategy 1: Found file at stored filePath: ${candidatePath}`);
            }
        }

        // Strategy 2: For system templates, try public/system-templates directory
        if (!originalFileAbsolutePath && originalTemplate.isSystemTemplate) {
            if (originalTemplate.templateFileUrl) {
                // Extract filename from templateFileUrl
                const urlPath = originalTemplate.templateFileUrl.split('?')[0];
                const fileName = path.basename(urlPath);
                const systemTemplatePath = path.join(process.cwd(), 'public', 'system-templates', fileName);
                
                if (fs.existsSync(systemTemplatePath)) {
                    originalFileAbsolutePath = systemTemplatePath;
                    console.log(`[DUPLICATE TEMPLATE] Strategy 2: Found system template from templateFileUrl: ${systemTemplatePath}`);
                }
            }
            
            // Strategy 3: Try extracting filename from filePath
            if (!originalFileAbsolutePath && originalTemplate.filePath) {
                const fileName = path.basename(originalTemplate.filePath);
                const systemTemplatePath = path.join(process.cwd(), 'public', 'system-templates', fileName);
                
                if (fs.existsSync(systemTemplatePath)) {
                    originalFileAbsolutePath = systemTemplatePath;
                    console.log(`[DUPLICATE TEMPLATE] Strategy 3: Found system template by filename: ${systemTemplatePath}`);
                }
            }
        }

        // Copy the file if we found it
        if (originalFileAbsolutePath && fs.existsSync(originalFileAbsolutePath)) {
            const userDir = path.join(process.cwd(), 'uploads', userId);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }

            const newFileName = `${uuidv4()}.pdf`;
            const newFileRelativePath = path.join('uploads', userId, newFileName);
            const newFileAbsolutePath = path.join(process.cwd(), newFileRelativePath);

            fs.copyFileSync(originalFileAbsolutePath, newFileAbsolutePath);
            newTemplate.filePath = newFileRelativePath;
            console.log(`[DUPLICATE TEMPLATE] Copied PDF from ${originalFileAbsolutePath} to ${newFileAbsolutePath}`);
        } else {
            // If we can't find the original file, we need to return an error
            // since filePath is required in the model
            console.error(`[DUPLICATE TEMPLATE] Original template file not found. Template filePath: "${originalTemplate.filePath}", templateFileUrl: "${originalTemplate.templateFileUrl}", isSystemTemplate: ${originalTemplate.isSystemTemplate}`);
            return NextResponse.json({ 
                message: 'Original template file not found on server. Cannot duplicate template.',
                error: 'Template file missing'
            }, { status: 404 });
        }

        // Set templateFileUrl - will be updated after save with actual template ID
        newTemplate.templateFileUrl = `/api/templates/temp`;

        await newTemplate.save();

        // Update templateFileUrl with the actual template ID
        newTemplate.templateFileUrl = `/api/templates/${newTemplate._id}`;
        await newTemplate.save();

        return NextResponse.json({
            message: 'Template duplicated successfully',
            template: newTemplate,
        }, { status: 201 });

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Error duplicating template:', errMsg, error);
        return NextResponse.json({ message: 'Failed to duplicate template', error: errMsg }, { status: 500 });
    }
}