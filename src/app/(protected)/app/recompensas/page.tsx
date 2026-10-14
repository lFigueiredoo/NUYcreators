import { Suspense } from 'react';
import { RewardsScreen } from '@/features/workspace/components/rewards-screen';
import { LoadingCards } from '@/features/workspace/components/ui/state';
import { loadJourney } from '@/features/workspace/services/journey';
import { loadCatalog, redemptionEnabled } from '@/features/workspace/services/rewards';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recompensas' };

export default function RewardsPage() {
  return (
    <Suspense fallback={<LoadingCards />}>
      <RewardsBody />
    </Suspense>
  );
}

async function RewardsBody() {
  const { secret, viewer } = await workspaceSession();
  const now = new Date();
  // A jornada é a MESMA leitura da tela de Pontos (o saldo exibido é o mesmo
  // número). Ela entra no catálogo como PROMESSA: as duas leituras do catálogo
  // começam no mesmo tick que ela, em vez de esperar a jornada resolver.
  const journey = loadJourney(secret, viewer.id);
  const catalog = await loadCatalog(secret, viewer.id, now, journey);
  return <RewardsScreen catalog={catalog} redemptionEnabled={redemptionEnabled()} />;
}
