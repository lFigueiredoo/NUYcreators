import { NewRewardScreen } from '@/features/admin/components/rewards-screen';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nova recompensa' };

/**
 * Sem Suspense aqui de propósito: a tela não lê nada para abrir — o formulário sai
 * vazio a partir do próprio schema. Um esqueleto de carregamento só apareceria para
 * piscar.
 */
export default async function NewRewardPage() {
  await requireStaff('manage-catalog');
  return <NewRewardScreen />;
}
