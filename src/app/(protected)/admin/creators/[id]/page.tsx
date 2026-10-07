import { Suspense } from 'react';
import { CreatorDetailScreen } from '@/features/admin/components/creators-screen';
import { loadCreator } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Creator · ${id}` };
}

export default async function AdminCreatorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('view-audit');
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <CreatorBody id={id} />
    </Suspense>
  );
}

async function CreatorBody({ id }: { id: string }) {
  const creator = await loadCreator(id);
  return <CreatorDetailScreen creator={creator} />;
}
