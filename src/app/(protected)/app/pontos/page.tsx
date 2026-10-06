import { Suspense } from 'react';
import { PointsScreen } from '@/features/workspace/components/points-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { loadJourney } from '@/features/workspace/services/journey';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pontos NUY' };

export default function PointsPage() {
  return (
    <Suspense fallback={<LoadingBlock lines={3} />}>
      <PointsBody />
    </Suspense>
  );
}

async function PointsBody() {
  const { secret, viewer } = await workspaceSession();
  const journey = await loadJourney(secret, viewer.id);
  return <PointsScreen journey={journey} />;
}
