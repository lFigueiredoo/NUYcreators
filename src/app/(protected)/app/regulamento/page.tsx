import type { Metadata } from 'next';
import { RegulationScreen } from '@/features/regulation/components/regulation-screen';
import { loadRegulationPublication } from '@/features/workspace/services/regulation';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const metadata: Metadata = {
  title: 'Regulamento',
  description: 'Regras, pontuação e premiação do Programa NUY Creators.',
};

export default async function RegulationPage() {
  await workspaceSession();
  const publication = loadRegulationPublication();

  return <RegulationScreen publication={publication} />;
}
