import type { AdminDailyActivity } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';

type SaveAction = (formData: FormData) => Promise<void>;

function ActivityFields({
  item,
  editing = false,
}: {
  item?: AdminDailyActivity;
  editing?: boolean;
}) {
  return (
    <>
      {item ? <input type="hidden" name="activityId" value={item.activityId} /> : null}
      <div className={styles.dailyFormGrid}>
        <label className={styles.dailyField}>
          <span>Nome da atividade</span>
          <input
            name="name"
            required
            defaultValue={item?.name}
            placeholder="Ex.: Reel mostrando o produto"
          />
          <small>Um nome curto que a creator entenda de primeira.</small>
        </label>
        <label className={styles.dailyField}>
          <span>Plataforma</span>
          <input
            name="platform"
            required
            defaultValue={item?.platform}
            placeholder="Instagram, TikTok ou Shopee"
          />
        </label>
        <label className={styles.dailyField}>
          <span>Formato ou ação</span>
          <input
            name="format"
            required
            defaultValue={item?.format}
            placeholder="Ex.: Reel, story ou live"
          />
        </label>
        <label className={styles.dailyField}>
          <span>Pontos por envio</span>
          <input name="points" required type="number" min="0" defaultValue={item?.points ?? 10} />
          <small>Entram no ranking depois da aprovação.</small>
        </label>
        <label className={styles.dailyField}>
          <span>Limite por dia</span>
          <input
            name="dailyLimit"
            required
            type="number"
            min="1"
            defaultValue={item?.dailyLimit ?? 1}
          />
        </label>
      </div>
      <label className={`${styles.dailyField} ${styles.dailyFieldFull}`}>
        <span>O que precisa aparecer</span>
        <textarea
          name="rules"
          required
          defaultValue={item?.rules}
          placeholder="Explique em uma frase o que a creator precisa mostrar ou fazer."
        />
        <small>Essa orientação aparece antes do envio do link e do print.</small>
      </label>
      <label className={styles.dailyToggle}>
        <input name="active" type="checkbox" defaultChecked={item?.active ?? true} />
        <span>
          <strong>
            {editing ? 'Atividade disponível para creators' : 'Publicar assim que salvar'}
          </strong>
          <small>
            {editing
              ? 'Desmarque para pausar novos envios sem apagar o histórico.'
              : 'Você pode pausar depois sem perder os envios já recebidos.'}
          </small>
        </span>
      </label>
    </>
  );
}

export function DailyActivitiesScreen({
  result,
  save,
}: {
  result: AdminOutcome<{ items: AdminDailyActivity[] }>;
  save: SaveAction;
}) {
  const items = result.ok ? result.value.items : [];
  const activeCount = items.filter((item) => item.active).length;
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Atividades diárias"
        intro="Crie tarefas simples para a comunidade enviar todos os dias. A equipe aprova cada envio antes de liberar os pontos."
      />
      <div className={styles.dailySummary}>
        <div>
          <span className={styles.dailySummaryLabel}>Operação de hoje</span>
          <strong>
            {activeCount} {activeCount === 1 ? 'atividade ativa' : 'atividades ativas'}
          </strong>
          <p>As creators encontram essas tarefas na aba Desafios.</p>
        </div>
        <div className={styles.dailySummaryRule} />
        <div>
          <span className={styles.dailySummaryLabel}>Como funciona</span>
          <strong>Publicar → receber → aprovar</strong>
          <p>O limite diário é aplicado por creator e por atividade.</p>
        </div>
      </div>
      <Block title="Criar atividade" className={styles.dailyCreateBlock}>
        <form action={save} className={styles.dailyForm}>
          <ActivityFields />
          <div className={styles.actions}>
            <button type="submit" className={`${appStyles.button} ${appStyles.buttonPrimary}`}>
              Criar atividade
            </button>
            <span className={styles.dailyFormHint}>Você poderá editar ou pausar depois.</span>
          </div>
        </form>
      </Block>
      <Block
        title="Atividades cadastradas"
        link={result.ok ? <span className={styles.counter}>{items.length} no total</span> : null}
      >
        {!result.ok ? (
          <p className={styles.dailyError}>{result.message}</p>
        ) : items.length === 0 ? (
          <div className={styles.dailyEmpty}>
            <span className={styles.dailyEmptyMark}>+</span>
            <strong>Nenhuma atividade criada ainda</strong>
            <p>
              Comece pelo formulário acima. Uma boa tarefa tem nome curto, regra objetiva e um
              limite claro.
            </p>
          </div>
        ) : (
          <div className={styles.dailyList}>
            {items.map((item) => (
              <details key={item.activityId} className={styles.dailyItem}>
                <summary className={styles.dailyItemSummary}>
                  <span
                    className={`${styles.dailyStatus} ${item.active ? styles.dailyStatusActive : styles.dailyStatusPaused}`}
                  >
                    {item.active ? 'Ativa' : 'Pausada'}
                  </span>
                  <span className={styles.dailyItemTitle}>
                    <strong>{item.name}</strong>
                    <small>
                      {item.platform} · {item.format}
                    </small>
                  </span>
                  <span className={styles.dailyItemPoints}>
                    <strong>{item.points}</strong>
                    <small>pontos / envio</small>
                  </span>
                  <span className={styles.dailyItemLimit}>
                    até {item.dailyLimit} {item.dailyLimit === 1 ? 'envio' : 'envios'} por dia
                  </span>
                  <span className={styles.dailyEdit}>Editar</span>
                </summary>
                <div className={styles.dailyEditPanel}>
                  <p className={styles.dailyEditIntro}>
                    Ajuste os dados abaixo. Pausar não remove o histórico de envios.
                  </p>
                  <form action={save} className={styles.dailyForm}>
                    <ActivityFields item={item} editing />
                    <div className={styles.actions}>
                      <button
                        type="submit"
                        className={`${appStyles.button} ${appStyles.buttonPrimary}`}
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}
