import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import TemplateModel from '@/models/Template';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        const userId = await getAuthSession(req);
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { templateIds: inputTemplateIds } = await req.json();

        if (!inputTemplateIds) {
            return NextResponse.json({ message: 'Template IDs not provided' }, { status: 400 });
        }
        const templateIds = Array.isArray(inputTemplateIds)
            ? inputTemplateIds
            : [inputTemplateIds];

        if (templateIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            return NextResponse.json(
                { message: 'Invalid template ID(s) provided' },
                { status: 400 }
            );
        }

        const now = new Date();

        if (templateIds.length === 1) {
            const templateId = templateIds[0];
            const template = await TemplateModel.findById(templateId);

            if (!template) {
                return NextResponse.json({ message: 'Template not found' }, { status: 404 });
            }

            if (template.isSystemTemplate) {
                return NextResponse.json(
                    { message: 'Cannot trash system templates' },
                    { status: 403 }
                );
            }

            if (!template.userId || template.userId.toString() !== userId) {
                return NextResponse.json(
                    { message: 'Forbidden: You can only trash your own templates' },
                    { status: 403 }
                );
            }

            template.deletedAt = now;
            template.isActive = false;
            await template.save();

            console.log(`[TRASH TEMPLATE] Successfully trashed template ${templateId}`);

            return NextResponse.json({
                message: 'Template moved to trash successfully',
                template,
            });
        }

        // MULTIPLE TEMPLATES
        const updateResult = await TemplateModel.updateMany(
            {
                _id: { $in: templateIds },
                userId: new mongoose.Types.ObjectId(userId),
                isSystemTemplate: { $ne: true },
            },
            {
                $set: {
                    isActive: false,
                    deletedAt: now,
                },
            }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json(
                { message: 'No matching templates found to trash.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Templates moved to trash successfully' });
    } catch (error) {
        console.error('[TRASH TEMPLATES] API Error:', error);
        return NextResponse.json(
            {
                message: 'Internal Server Error',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
