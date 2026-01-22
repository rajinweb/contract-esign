import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import { getUserIdFromReq } from '@/lib/auth';
import TemplateModel, { ITemplate } from '@/models/Template';
import { FilterQuery } from 'mongoose';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();
        const userId = await getUserIdFromReq(req);

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const isSystem = searchParams.get('isSystem') === 'true';
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');
        const returnCount = searchParams.get('returnCount') === 'true'; // New parameter

        const limit = searchParams.get('limit');

        /**  
         * The correct type for a Mongoose find() query  
         */
        const query: FilterQuery<ITemplate> = {};
        if (isActive === 'false') {
            query.isActive = false;
        } else if (isActive === 'true') { // Corrected typo
            query.isActive = true;
        }

        if (isSystem || !userId) {
            query.isSystemTemplate = true;
        } else {
            query.$or = [
                { userId, isSystemTemplate: false },
                { isSystemTemplate: true }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$text = { $search: search };
        }

        let totalCount = 0;
        if (returnCount) {
            totalCount = await TemplateModel.countDocuments(query);
        }

        let templatesQuery = TemplateModel.find(query)
            .sort({ createdAt: -1 })
            .select(
                '_id name description category isSystemTemplate templateFileUrl thumbnailUrl pageCount tags createdAt duplicateCount isActive deletedAt' // Added deletedAt
            );
        
        if (limit) {
            const parsedLimit = parseInt(limit, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                templatesQuery = templatesQuery.limit(parsedLimit);
            }
        }

        const templates = await templatesQuery;

        return NextResponse.json({ success: true, templates, ...(returnCount && { totalCount }) }); // Include totalCount conditionally
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({ message: 'Failed to fetch templates' }, { status: 500 });
    }
}
