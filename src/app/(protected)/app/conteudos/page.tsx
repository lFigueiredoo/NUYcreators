import { Suspense } from 'react';
import { ContentsScreen } from '@/features/workspace/components/contents-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { submissionTabs, type SubmissionTab } from '@/features/workspace/domain/status';
import { loadContents } from '@/features/workspace/services/content';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus conteúdos' };

/** Aba desconhecida na URL cai em "Todos" em vez de quebrar. */
function parseTab(value: string | string[] | undefined): SubmissionTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return (submissionTabs.find((tab) => tab.id === raw)?.id ?? 'all') as SubmissionTab;
}

export default async function ContentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tab = parseTab((await searchParams).aba);
  return (
    <Suspense fallback={<LoadingBlock lines={4} />}>
      <ContentsBody tab={tab} />
    </Suspense>
  );
}

async function ContentsBody({ tab }: { tab: SubmissionTab }) {
  const { secret, viewer } = await workspaceSession();
  const contents = await loadContents(secret, viewer.id);
  return <ContentsScreen entries={contents.state === 'ok' ? contents.items : null} tab={tab} />;
}
