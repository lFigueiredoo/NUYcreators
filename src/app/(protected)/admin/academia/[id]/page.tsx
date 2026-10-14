import { AcademyEditor } from '@/features/academy/components/editor';
import { AcademyNotice } from '@/features/academy/components/creator';
import { adminAcademyCourse, adminAcademyCategories } from '@/features/academy/services/read';
import { requireStaff } from '@/lib/security/authorization';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { academyEnabled } from '@/features/academy/domain';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar treinamento · Academia NUY' };

export default async function EditAcademyCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff('manage-catalog');
  const { id } = await params;
  const [detail, categories] = await Promise.all([
    adminAcademyCourse(id),
    adminAcademyCategories(),
  ]);
  if (
    detail.courseState !== 'ok' ||
    detail.modules.state !== 'ok' ||
    detail.lessons.state !== 'ok' ||
    detail.materials.state !== 'ok' ||
    categories.state !== 'ok'
  )
    return (
      <div>
        <Link href="/admin/academia">Voltar à Academia</Link>
        <AcademyNotice text="Não foi possível carregar este treinamento neste ambiente." />
      </div>
    );
  if (!detail.course) notFound();
  return (
    <AcademyEditor
      key={detail.course.id}
      course={detail.course}
      categories={categories.items}
      existingModules={detail.modules.items}
      existingLessons={detail.lessons.items}
      existingMaterials={detail.materials.items}
      enabled={academyEnabled()}
    />
  );
}
