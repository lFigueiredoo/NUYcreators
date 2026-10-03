import { EmptyState } from '@/components/feedback/empty-state';
export const metadata = { title: 'Ranking' };
export default function Ranking() {
  return (
    <>
      <p className="eyebrow">Reconhecer quem inspira</p>
      <h1>
        Muitos olhares.
        <br />
        <em>Uma comunidade.</em>
      </h1>
      <EmptyState
        title="O ranking ainda não está ativo."
        description="As classificações geral e mensal serão calculadas a partir de pontos elegíveis conquistados, nunca do saldo de resgate."
        unavailable
      />
    </>
  );
}
