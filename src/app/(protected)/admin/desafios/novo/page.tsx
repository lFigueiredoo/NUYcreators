import { Suspense } from 'react';
import { NewChallengeScreen } from '@/features/admin/components/challenges-screen';
import { loadOptions } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';
import { mediaConfigured } from '@/lib/appwrite/media';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Novo desafio' };

export default async function NewChallengePage() {
  await requireStaff('manage-catalog');
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <NewChallengeBody />
    </Suspense>
  );
}

async function NewChallengeBody() {
  const choices = await loadOptions();
  return <NewChallengeScreen choices={choices} mediaEnabled={mediaConfigured()} />;
}
