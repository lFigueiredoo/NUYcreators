import { Suspense } from 'react';
import { CreatorsScreen } from '@/features/admin/components/creators-screen';
import { loadCreators } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Creators' };

function parseSearch(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  return raw.trim().slice(0, 80);
}

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('view-audit');
  const search = parseSearch((await searchParams).busca);
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <CreatorsBody search={search} />
    </Suspense>
  );
}

async function CreatorsBody({ search }: { search: string }) {
  const creators = await loadCreators(search);
  return <CreatorsScreen creators={creators} search={search} />;
}
