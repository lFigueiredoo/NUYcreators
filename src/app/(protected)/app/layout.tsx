import { redirect } from 'next/navigation';
import { AppShell } from '@/features/workspace/components/app-shell';
import { loadUnreadCount } from '@/features/workspace/services/notifications';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';

/**
 * Guarda da área autenticada.
 *
 * `requireSession` (dentro de `workspaceSession`) redireciona quem não tem
 * sessão para `/login`. Quem tem sessão mas ainda não concluiu o onboarding
 * volta para `/onboarding` — e continua conservador quando o perfil não pode
 * ser lido: sem confirmação de conclusão, não presumimos que concluiu.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { secret, viewer } = await workspaceSession();
  // Perfil ausente, incompleto ou ilegível: retoma o onboarding.
  if (viewer.profileState !== 'ok' || !viewer.profile?.onboarded) redirect('/onboarding');
  const unread = await loadUnreadCount(secret, viewer.id);
  return (
    <AppShell viewer={viewer} unread={unread}>
      {children}
    </AppShell>
  );
}
