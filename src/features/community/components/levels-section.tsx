import { EmptyState } from '@/components/feedback/empty-state';
import type { CreatorLevel } from '../services/public-data';
export function LevelsSection({ levels, status }: { levels: CreatorLevel[]; status: string }) {
  return (
    <section id="niveis" className="cream-section section-pad">
      <p className="eyebrow">05 / Cada criação, um novo passo</p>
      <div className="section-heading">
        <h2>
          Seu olhar evolui.
          <br />
          <em>Sua jornada também.</em>
        </h2>
        <p>
          Conquiste pontos elegíveis e evolua de nível.
          <br />
          Resgatar recompensas não reduz seu progresso.
        </p>
      </div>
      {levels.length ? (
        <ol className="levels-list">
          {levels.map((level) => (
            <li key={level.$id}>
              <span>{String(level.order + 1).padStart(2, '0')}</span>
              <h3>{level.name}</h3>
              <p>
                {level.minPoints.toLocaleString('pt-BR')}{' '}
                {level.maxPoints === null
                  ? 'pontos em diante'
                  : `a ${level.maxPoints.toLocaleString('pt-BR')} pontos`}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={
            status === 'error'
              ? 'Não foi possível consultar os níveis.'
              : 'Uma jornada em cinco níveis.'
          }
          description="As faixas e regras serão exibidas a partir da configuração oficial do backend, sem regras duplicadas na interface."
          unavailable={status === 'disconnected'}
        />
      )}
    </section>
  );
}
