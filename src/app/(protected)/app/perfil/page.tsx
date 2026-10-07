import { Suspense } from 'react';
import { ProfileScreen } from '@/features/workspace/components/profile-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { operationsOnline } from '@/features/workspace/services/commands';
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
  const { viewer } = await workspaceSession();
  // A edição é escrita mediada pelo servidor: sem a chave de operação, a tela
  // informa o estado real em vez de mostrar um formulário que não grava.
  return <ProfileScreen viewer={viewer} editEnabled={operationsOnline()} />;
}
