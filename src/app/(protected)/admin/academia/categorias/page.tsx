import { AdminAcademyCategories } from '@/features/academy/components/admin';
import { adminAcademyCategories } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categorias · Academia NUY' };

export default async function AdminAcademyCategoriesPage() {
  await requireStaff('manage-catalog');
  return <AdminAcademyCategories categories={await adminAcademyCategories()} />;
}
