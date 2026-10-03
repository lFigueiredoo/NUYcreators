import { EmptyState } from '@/components/feedback/empty-state';
export const metadata = { title: 'Desafios' };
export default function Challenges() {
  return (
    <>
      <p className="eyebrow">Convites para criar</p>
      <h1>
        Seu olhar.
        <br />
        <em>Novas possibilidades.</em>
      </h1>
      <EmptyState
        title="Nenhum desafio disponível nesta etapa."
        description="A participação e as submissões serão implementadas nas próximas etapas. Não há desafios demonstrativos publicados."
        unavailable
      />
    </>
  );
}
