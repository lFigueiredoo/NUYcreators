import { Suspense } from 'react';
import {
  ChallengesScreen,
  parseChallengeTab,
  type ChallengeTab,
} from '@/features/admin/components/challenges-screen';
import { loadChallenges } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Desafios' };

export default async function AdminChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('manage-catalog');
  const status = parseChallengeTab((await searchParams).estado);
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <ChallengesBody status={status} />
    </Suspense>
  );
}

async function ChallengesBody({ status }: { status: ChallengeTab }) {
  // A aba "publicados" pede as duas palavras do "no ar" no núcleo: `live` é o filtro
  // que o catálogo usa, não um estado novo inventado pela tela.
  const challenges = await loadChallenges(status === 'all' ? '' : status);
  return <ChallengesScreen status={status} challenges={challenges} />;
}
