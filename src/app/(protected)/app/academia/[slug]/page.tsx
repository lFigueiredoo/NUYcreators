import { AcademyCourseDetail } from '@/features/academy/components/creator';
import { creatorAcademyCourse, creatorCourseProgress } from '@/features/academy/services/read';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Treinamento · Academia NUY' };

export default async function AcademyCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { secret, viewer } = await workspaceSession();
  const { course, courseState, modules, lessons, materials } = await creatorAcademyCourse(
    secret,
    slug,
  );
  const progress = course ? await creatorCourseProgress(secret, viewer.id, course.id)
    : { state: 'pending' as const, items: [] };
  return (
    <AcademyCourseDetail
      course={course}
      courseState={courseState}
      modules={modules}
      lessons={lessons}
      materials={materials}
      progress={progress}
    />
  );
}
