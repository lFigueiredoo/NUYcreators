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
  // A jornada sai daqui como PROMESSA e entra também no `loadCatalog`, que a
  // espera dentro da própria `Promise.all` junto com as duas leituras do
  // catálogo. Antes, o catálogo só começava depois de a jornada resolver — era o
  // último estágio do painel (medido no journal: estágios 4 e 5). As leituras são
  // as mesmas, os escopos são os mesmos e a elegibilidade continua usando
  // `journey.summary`; o que muda é só quando elas começam.
  const journey = loadJourney(secret, userId);
  const [journeyView, challenges, ranking, catalog] = await Promise.all([
    journey,
    loadChallenges(secret, userId),
    loadRanking(secret, userId, now),
    loadCatalog(secret, userId, now, journey),
  ]);
  return (
    <DashboardData
      journey={journeyView}
      challenges={challenges}
      ranking={ranking}
      catalog={catalog}
      now={now}
    />
  );
}
