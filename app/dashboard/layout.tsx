import type { ReactNode } from 'react';
import { requireRefreshSessionOrRedirect } from '@/lib/requireRefreshSession';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireRefreshSessionOrRedirect();

  return <>{children}</>;
}
