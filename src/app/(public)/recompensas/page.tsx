import { EmptyState } from '@/components/feedback/empty-state';
export const metadata = { title: 'Recompensas' };
export default function Rewards() {
  return (
    <>
      <p className="eyebrow">Novas conquistas</p>
      <h1>
        Criação que se torna
        <br />
        <em>experiência.</em>
      </h1>
      <EmptyState
        title="O catálogo ainda não foi liberado."
        description="Produtos, kits, benefícios e experiências serão exibidos somente quando publicados pela equipe NUY. Resgates não estão ativos."
        unavailable
      />
    </>
  );
}
