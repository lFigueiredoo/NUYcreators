import { Suspense } from 'react';
import {
  RewardsScreen,
  parseRewardTab,
  type RewardTab,
} from '@/features/admin/components/rewards-screen';
import { loadRewards } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recompensas' };

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('manage-catalog');
  const status = parseRewardTab((await searchParams).estado);
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <RewardsBody status={status} />
    </Suspense>
  );
}

async function RewardsBody({ status }: { status: RewardTab }) {
  const rewards = await loadRewards(status === 'all' ? '' : status);
  return <RewardsScreen status={status} rewards={rewards} />;
}
