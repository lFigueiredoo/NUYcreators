import { Suspense } from 'react';
import { SubmissionDetailScreen } from '@/features/admin/components/submissions-screen';
import { loadSubmission } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Envio · ${id}` };
}

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('moderate');
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <SubmissionBody id={id} />
    </Suspense>
  );
}

async function SubmissionBody({ id }: { id: string }) {
  const submission = await loadSubmission(id);
  return <SubmissionDetailScreen submission={submission} />;
}
