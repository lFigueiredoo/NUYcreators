import { Suspense } from 'react';
import { OverviewScreen, OverviewSkeleton } from '@/features/admin/components/overview-screen';
import { loadOverview, loadRecentAudit } from '@/features/admin/services/console';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visão geral' };

/**
 * Visão geral da operação.
 *
 * Toda rota /admin passa por `requireStaff` com a capacidade que ela exige, e este
 * é o mesmo portão do layout: confirmar o papel aqui não substitui confirmar lá, e
 * vice-versa. Nada é lido antes de o papel ser confirmado.
 */
export default async function AdminOverviewPage() {
  await requireStaff('view-audit');
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewBody />
    </Suspense>
  );
}

async function OverviewBody() {
  const [overview, audit] = await Promise.all([loadOverview(), loadRecentAudit()]);
  return <OverviewScreen overview={overview} audit={audit} />;
}
