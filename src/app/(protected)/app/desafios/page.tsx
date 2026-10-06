import { Suspense } from 'react';
import { ChallengesScreen } from '@/features/workspace/components/challenges-screen';
import { LoadingCards } from '@/features/workspace/components/ui/state';
import { challengeTabs, type ChallengeTab } from '@/features/workspace/domain/status';
import { loadChallenges } from '@/features/workspace/services/challenges';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Desafios' };

/** Aba desconhecida na URL cai em "Disponíveis" em vez de quebrar. */
function parseTab(value: string | string[] | undefined): ChallengeTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return (challengeTabs.find((tab) => tab.id === raw)?.id ?? 'available') as ChallengeTab;
}

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tab = parseTab((await searchParams).aba);
  return (
    <Suspense fallback={<LoadingCards />}>
      <ChallengesBody tab={tab} />
    </Suspense>
  );
}

async function ChallengesBody({ tab }: { tab: ChallengeTab }) {
  const { secret, viewer } = await workspaceSession();
  const challenges = await loadChallenges(secret, viewer.id);
  return (
    <ChallengesScreen
      view={challenges.state === 'ok' ? challenges.items : null}
      tab={tab}
      now={new Date()}
    />
  );
}
