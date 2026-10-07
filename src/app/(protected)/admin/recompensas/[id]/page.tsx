import { Suspense } from 'react';
import { RewardDetailScreen } from '@/features/admin/components/rewards-screen';
import { loadReward } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { rankingTimeZone } from '@/features/workspace/domain/ranking';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Recompensa · ${id}` };
}

export default async function AdminRewardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('manage-catalog');
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <RewardBody id={id} />
    </Suspense>
  );
}

async function RewardBody({ id }: { id: string }) {
  const reward = await loadReward(id);
  return <RewardDetailScreen reward={reward} timeZone={rankingTimeZone} />;
}
