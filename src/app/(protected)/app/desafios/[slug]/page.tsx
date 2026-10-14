import { Suspense } from 'react';
import { ChallengeDetailScreen } from '@/features/workspace/components/challenges-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import {
  loadChallengeDetail,
  participationEnabled,
} from '@/features/workspace/services/challenges';
import { workspaceSession } from '@/features/workspace/services/viewer';
import { challengeComments } from '@/features/academy/services/read';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Desafio · ${slug}` };
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<LoadingBlock lines={4} />}>
      <ChallengeDetailBody slug={slug} />
    </Suspense>
  );
}

async function ChallengeDetailBody({ slug }: { slug: string }) {
  const { secret, viewer } = await workspaceSession();
  const detail = await loadChallengeDetail(secret, viewer.id, slug);
  const challengeId = detail.challenge.state === 'ok' ? detail.challenge.items[0]?.id : null;
  const comments = challengeId
    ? await challengeComments(secret, challengeId)
    : { state: 'pending' as const, items: [] };
  return (
    <ChallengeDetailScreen
      detail={detail}
      slug={slug}
      now={new Date()}
      participationEnabled={participationEnabled()}
      comments={comments}
      viewerId={viewer.id}
    />
  );
}
