import { Suspense } from 'react';
import { RankingScreen } from '@/features/workspace/components/ranking-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { loadRanking } from '@/features/workspace/services/ranking';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ranking' };

export default function RankingPage() {
  return (
    <Suspense fallback={<LoadingBlock lines={4} />}>
      <RankingBody />
    </Suspense>
  );
}

async function RankingBody() {
  const { secret, viewer } = await workspaceSession();
  const ranking = await loadRanking(secret, viewer.id);
  return <RankingScreen ranking={ranking} />;
}
