import type { ReactNode } from 'react';
import { requireRefreshSessionOrRedirect } from '@/lib/requireRefreshSession';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireRefreshSessionOrRedirect();

  return <>{children}</>;
}
