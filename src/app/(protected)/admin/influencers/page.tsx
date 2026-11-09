import { requireStaff } from '@/lib/security/authorization';
import { InfluencersScreen } from '@/features/admin/components/influencers-screen';
import { loadInfluencersForAdmin } from '@/features/admin/services/influencers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fotos das influencers' };

export default async function AdminInfluencersPage() {
  await requireStaff('manage-catalog');
  const influencers = await loadInfluencersForAdmin();
  return <InfluencersScreen influencers={influencers} />;
}
