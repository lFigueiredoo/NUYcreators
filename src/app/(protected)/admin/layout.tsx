import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: { default: 'Administração', template: '%s · Administração NUY Creators' },
};

/**
 * Guarda da área administrativa.
 *
 * Vale para TODA rota sob `/admin`, inclusive as que ainda não existem: sem
 * sessão vai para `/login`, e com sessão sem membership CONFIRMADA na equipe
 * administrativa vai para `/app?access=denied`. Cada página ainda repete o
 * `requireStaff` com a capacidade que a sua leitura exige — o layout garante a
 * porta, a página garante a capacidade.
 *
 * O papel nunca vem de campo, parâmetro ou cookie: vem de `listMemberships`
 * com o segredo da própria sessão e identidade conferida (`ownTeamRoles`).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, roles } = await requireStaff();
  return (
    <AdminShell name={user.name} email={user.email} roles={roles}>
      {children}
    </AdminShell>
  );
}
