import { Suspense } from 'react';
import { AdminApprovals } from '@/features/accounts/components/admin-approvals';
import { loadAdminCreatorApplications } from '@/features/accounts/services/admin';
import type { ReviewedAccountStatus } from '@/features/accounts/domain/approval';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aprovar contas' };

function value(input: string | string[] | undefined) {
  return typeof input === 'string' ? input : '';
}

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff('review-creators');
  const params = await searchParams;
  const rawStatus = value(params.status);
  const status: ReviewedAccountStatus =
    rawStatus === 'active' || rawStatus === 'rejected' ? rawStatus : 'pending_review';
  const rawCursor = value(params.cursor);
  const cursor = /^[A-Za-z0-9._-]{1,36}$/.test(rawCursor) ? rawCursor : undefined;
  const rawOutcome = value(params.resultado);
  const outcome = rawOutcome === 'approved' || rawOutcome === 'rejected' ? rawOutcome : undefined;
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <ApplicationsBody status={status} cursor={cursor} outcome={outcome} />
    </Suspense>
  );
}

async function ApplicationsBody({
  status,
  cursor,
  outcome,
}: {
  status: ReviewedAccountStatus;
  cursor?: string;
  outcome?: 'approved' | 'rejected';
}) {
  const result = await loadAdminCreatorApplications({ status, cursor });
  return <AdminApprovals result={result} status={status} outcome={outcome} />;
}
