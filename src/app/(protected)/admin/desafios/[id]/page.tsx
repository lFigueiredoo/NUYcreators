import { Suspense } from 'react';
import { ChallengeDetailScreen } from '@/features/admin/components/challenges-screen';
import { loadChallenge, loadOptions } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { rankingTimeZone } from '@/features/workspace/domain/ranking';
import { requireStaff } from '@/lib/security/authorization';
import { mediaConfigured } from '@/lib/appwrite/media';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Desafio · ${id}` };
}

export default async function AdminChallengePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('manage-catalog');
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <ChallengeBody id={id} />
    </Suspense>
  );
}

async function ChallengeBody({ id }: { id: string }) {
  const [challenge, choices] = await Promise.all([loadChallenge(id), loadOptions()]);
  return (
    <ChallengeDetailScreen
      challenge={challenge}
      choices={choices}
      timeZone={rankingTimeZone}
      mediaEnabled={mediaConfigured()}
    />
  );
}
