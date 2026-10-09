import { Suspense } from 'react';
import { ProfileScreen } from '@/features/workspace/components/profile-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { operationsOnline } from '@/features/workspace/services/commands';
import { loadLevelName } from '@/features/workspace/services/journey';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu perfil' };

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingBlock lines={4} />}>
      <ProfileBody />
    </Suspense>
  );
}

async function ProfileBody() {
  const { secret, viewer } = await workspaceSession();
  // O nível é `cache`ado e já foi lido pelo layout: aqui ele chega sem uma
  // segunda ida ao backend. `null` quando não há conta de pontos ou níveis
  // publicados — e aí a tela simplesmente não mostra nível, em vez de inventar um.
  const level = await loadLevelName(secret, viewer.id);
  // A edição é escrita mediada pelo servidor: sem a chave de operação, a tela
  // informa o estado real em vez de mostrar um formulário que não grava.
  return <ProfileScreen viewer={viewer} level={level} editEnabled={operationsOnline()} />;
}
