import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuthenticatedUserIdFromRefreshToken } from '@/lib/api-helpers';
import { REFRESH_TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function requireRefreshSessionOrRedirect(): Promise<string> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  if (!refreshToken) {
    redirect('/login');
  }

  const userId = await getAuthenticatedUserIdFromRefreshToken(refreshToken);
  if (!userId) {
    redirect('/login');
  }

  return userId;
}
