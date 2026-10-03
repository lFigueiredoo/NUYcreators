import { requireStaff } from '@/lib/security/authorization';
import { hasCapability } from '@/lib/security/memberships';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Autorização administrativa' };
export default async function StaffProof() {
  const { roles } = await requireStaff();
  return (
    <main id="main" className="public-inner">
      <h1>Autorização verificada.</h1>
      <p>Roles obtidas de membership confirmada no Appwrite: {roles.join(', ')}.</p>
      <p>
        {hasCapability(roles, 'moderate')
          ? 'Capacidade de moderação autorizada.'
          : 'Sem acesso de moderação.'}
      </p>
      <p>
        {hasCapability(roles, 'adjust-points')
          ? 'Capacidade administrativa autorizada; operações financeiras permanecem desativadas.'
          : 'Sem autorização para ajustes de pontos.'}
      </p>
      <p>
        Esta página valida acesso server-side. Nenhuma interface administrativa de domínio foi
        implementada.
      </p>
    </main>
  );
}
