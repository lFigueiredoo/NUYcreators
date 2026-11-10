import { Suspense } from 'react';
import { RankingScreen } from '@/features/workspace/components/ranking-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { loadRanking } from '@/features/workspace/services/ranking';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ranking' };

export default function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ campanha?: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<LoadingBlock lines={4} />}>
      <RankingBody searchParams={searchParams} />
    </Suspense>
  );
}

async function RankingBody({
  searchParams,
}: {
  searchParams: Promise<{ campanha?: string | string[] | undefined }>;
}) {
  const { secret, viewer } = await workspaceSession();
  const raw = (await searchParams).campanha;
  const campaignId = (Array.isArray(raw) ? raw[0] : raw)?.trim() || null;
  const ranking = await loadRanking(secret, viewer.id, campaignId);
  return <RankingScreen ranking={ranking} />;
}
