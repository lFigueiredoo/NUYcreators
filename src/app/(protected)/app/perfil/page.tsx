import { Suspense } from 'react';
import { ProfileScreen } from '@/features/workspace/components/profile-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
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
  return <ProfileScreen viewer={viewer} />;
}
