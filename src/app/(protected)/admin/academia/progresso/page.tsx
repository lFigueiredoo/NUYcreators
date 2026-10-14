import { AdminAcademyProgress } from '@/features/academy/components/admin';
import { adminAcademyProgressSummary } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Progresso · Academia NUY' };

export default async function AdminAcademyProgressPage() {
  await requireStaff('view-audit');
  return <AdminAcademyProgress progress={await adminAcademyProgressSummary()} />;
}
