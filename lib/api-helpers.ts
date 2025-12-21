import { NextRequest } from 'next/server';
import { getUserIdFromReq } from '@/lib/auth';
import connectDB from '@/utils/db';

/**
 * Connects to the database and retrieves the user ID from the request.
 * This function is designed to be called at the beginning of an API route handler.
 * It encapsulates the database connection and user authentication logic.
 * @param req The NextRequest object.
 * @returns A promise that resolves to the user ID (string) or null if not authenticated.
 * @throws Will throw an error if the database connection fails.
 */
export async function getAuthSession(req: NextRequest): Promise<string | null> {
  await connectDB();
  try {
    const userId = await getUserIdFromReq(req);
    return userId;
  } catch (error) {
    // In a real application, you might log the error here.
    // For now, we return null to adhere to the documented return type.
    return null;
  }
}