import { Suspense } from 'react';
import {
  DashboardData,
  DashboardHero,
  DashboardSkeleton,
} from '@/features/workspace/components/dashboard-screen';
import { loadChallenges } from '@/features/workspace/services/challenges';
import { loadJourney } from '@/features/workspace/services/journey';
import { loadRanking } from '@/features/workspace/services/ranking';
import { loadCatalog } from '@/features/workspace/services/rewards';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Início' };

/**
 * Início — o resumo real da jornada.
 *
 * O título usa o primeiro nome que existe (perfil ou conta). O corpo é
 * carregado em Suspense: esqueleto discreto enquanto as leituras reais
 * acontecem, nunca spinner no meio da tela.
 */
export default async function DashboardPage() {
  const { secret, viewer } = await workspaceSession();
  return (
    <>
      <DashboardHero firstName={viewer.firstName} />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody secret={secret} userId={viewer.id} />
      </Suspense>
    </>
  );
}

async function DashboardBody({ secret, userId }: { secret: string; userId: string }) {
  const now = new Date();
  const [journey, challenges, ranking] = await Promise.all([
    loadJourney(secret, userId),
    loadChallenges(secret, userId),
    loadRanking(secret, userId, now),
  ]);
  const catalog = await loadCatalog(secret, userId, now, journey);
  return (
    <DashboardData
      journey={journey}
      challenges={challenges}
      ranking={ranking}
      catalog={catalog}
      now={now}
    />
  );
}
