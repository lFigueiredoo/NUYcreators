import { AdminAcademyComments } from '@/features/academy/components/admin';
import { adminAcademyComments, adminAcademyReports } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comentários · Academia NUY' };

export default async function AdminAcademyCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  await requireStaff('moderate');
  const params = await searchParams;
  const requested = typeof params.pagina === 'string' ? Number(params.pagina) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 1000 ? requested : 1;
  const [comments, reports] = await Promise.all([
    adminAcademyComments(page),
    adminAcademyReports(),
  ]);
  return <AdminAcademyComments comments={comments} reports={reports} />;
}
