import { AcademyEditor } from '@/features/academy/components/editor';
import { adminAcademyCategories } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';
import { academyEnabled } from '@/features/academy/domain';

export const metadata = { title: 'Novo treinamento · Academia NUY' };
export default async function NewAcademyCoursePage() {
  await requireStaff('manage-catalog');
  const categories = await adminAcademyCategories();
  return <AcademyEditor categories={categories.items} enabled={academyEnabled() && categories.state === 'ok'} />;
}
