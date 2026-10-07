import { Suspense } from 'react';
import { CampaignsScreen } from '@/features/admin/components/campaigns-screen';
import { loadCampaigns } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { rankingTimeZone } from '@/features/workspace/domain/ranking';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Campanhas' };

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('manage-catalog');
  const raw = (await searchParams).editar;
  const editing = (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')).trim().slice(0, 36);
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <CampaignsBody editing={editing} />
    </Suspense>
  );
}

async function CampaignsBody({ editing }: { editing: string }) {
  const campaigns = await loadCampaigns();
  return <CampaignsScreen campaigns={campaigns} editing={editing} timeZone={rankingTimeZone} />;
}
