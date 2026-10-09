import { redirect } from 'next/navigation';
import { AppShell } from '@/features/workspace/components/app-shell';
import { loadLevelName } from '@/features/workspace/services/journey';
import { loadUnreadCount } from '@/features/workspace/services/notifications';
import { workspaceSession } from '@/features/workspace/services/viewer';
import { sessionRoles } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';

/**
 * Guarda da área autenticada.
 *
 * `requireSession` (dentro de `workspaceSession`) redireciona quem não tem
 * sessão para `/login`. Quem tem sessão mas ainda não concluiu o onboarding
 * volta para `/onboarding` — e continua conservador quando o perfil não pode
 * ser lido: sem confirmação de conclusão, não presumimos que concluiu. A
 * exceção é a operação administrativa: quem tem membership confirmada em
 * `nuy-admins` não é criadora em onboarding e vai para a área dela, não para o
 * formulário.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { secret, viewer } = await workspaceSession();
  // Perfil ausente, incompleto ou ilegível: retoma o onboarding — ou a
  // administração, para quem é da equipe.
  if (viewer.profileState !== 'ok' || !viewer.profile?.onboarded) {
    if ((await sessionRoles(secret, viewer.id)).length) redirect('/admin');
    redirect('/onboarding');
  }
  // Nível do cabeçalho: `loadLevelName` é `cache`ado e compartilha as duas
  // leituras com o painel — nas telas que já leem a jornada ele não lê de novo.
  const [unread, level] = await Promise.all([
    loadUnreadCount(secret, viewer.id),
    loadLevelName(secret, viewer.id),
  ]);
  return (
    <AppShell viewer={viewer} unread={unread} level={level}>
      {children}
    </AppShell>
  );
}
