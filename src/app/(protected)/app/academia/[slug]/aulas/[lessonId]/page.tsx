import { AcademyLessonDetail } from '@/features/academy/components/creator';
import { creatorAcademyCourse, creatorLessonProgress, lessonComments } from '@/features/academy/services/read';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aula · Academia NUY' };

export default async function AcademyLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const { secret, viewer } = await workspaceSession();
  const detail = await creatorAcademyCourse(secret, slug);
  const lesson = detail.lessons.items.find((item) => item.id === lessonId) ?? null;
  const comments = lesson
    ? await lessonComments(secret, lesson.id)
    : { state: 'pending' as const, items: [] };
  const progress = lesson ? await creatorLessonProgress(secret, viewer.id, lesson.id)
    : { state: 'pending' as const, items: [] };
  return (
    <AcademyLessonDetail
      course={detail.course}
      courseState={detail.courseState}
      lessonState={detail.lessons.state}
      lesson={lesson}
      materials={detail.materials.items.filter((item) => item.lessonId === lessonId)}
      materialState={detail.materials.state}
      comments={comments}
      viewerId={viewer.id}
      completed={progress.items.length > 0}
      progressEnabled={progress.state === 'ok'}
    />
  );
}
