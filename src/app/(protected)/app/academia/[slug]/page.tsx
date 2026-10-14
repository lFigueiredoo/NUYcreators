import { AcademyCourseDetail } from '@/features/academy/components/creator';
import { creatorAcademyCourse } from '@/features/academy/services/read';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Treinamento · Academia NUY' };

export default async function AcademyCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { secret } = await workspaceSession();
  const { course, courseState, modules, lessons, materials } = await creatorAcademyCourse(
    secret,
    slug,
  );
  return (
    <AcademyCourseDetail
      course={course}
      courseState={courseState}
      modules={modules}
      lessons={lessons}
      materials={materials}
    />
  );
}
