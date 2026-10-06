import { Suspense } from 'react';
import { NotificationsScreen } from '@/features/workspace/components/notifications-screen';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { loadNotifications } from '@/features/workspace/services/notifications';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notificações' };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingBlock lines={5} />}>
      <NotificationsBody />
    </Suspense>
  );
}

async function NotificationsBody() {
  const { secret, viewer } = await workspaceSession();
  const notifications = await loadNotifications(secret, viewer.id);
  return <NotificationsScreen view={notifications} />;
}
