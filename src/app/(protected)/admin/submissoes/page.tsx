import { Suspense } from 'react';
import {
  SubmissionsScreen,
  type SubmissionFilters,
} from '@/features/admin/components/submissions-screen';
import { loadChallenges, loadSubmissions } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Submissões' };

/** Um valor por parâmetro: array na URL vira o primeiro item, nunca concatenação. */
function one(value: string | string[] | undefined, max: number): string {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  return raw.trim().slice(0, max);
}

function parseFilters(params: { [key: string]: string | string[] | undefined }): SubmissionFilters {
  const status = one(params.estado, 24);
  return {
    status: status || 'all',
    challengeId: one(params.desafio, 36),
    userId: one(params.criadora, 36),
    from: one(params.de, 10),
    to: one(params.ate, 10),
  };
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('moderate');
  const filters = parseFilters(await searchParams);
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <SubmissionsBody filters={filters} />
    </Suspense>
  );
}

async function SubmissionsBody({ filters }: { filters: SubmissionFilters }) {
  // O catálogo alimenta o filtro por nome de desafio. Quem só modera não tem essa
  // capacidade: a chamada é recusada e a tela cai no filtro por id, em vez de mentir.
  const [submissions, challenges] = await Promise.all([
    loadSubmissions({
      status: filters.status,
      challengeId: filters.challengeId,
      userId: filters.userId,
      from: filters.from,
      to: filters.to,
    }),
    loadChallenges(''),
  ]);
  return <SubmissionsScreen submissions={submissions} challenges={challenges} filters={filters} />;
}
