import { AdminAcademyHome } from '@/features/academy/components/admin';
import { adminAcademyCatalog } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Academia NUY' };

export default async function AdminAcademyPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  await requireStaff('manage-catalog');
  const params = await searchParams;
  const requested = typeof params.pagina === 'string' ? Number(params.pagina) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 1000 ? requested : 1;
  return <AdminAcademyHome courses={await adminAcademyCatalog(page)} />;
}
