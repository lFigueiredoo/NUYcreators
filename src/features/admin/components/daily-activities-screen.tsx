import type { AdminDailyActivity } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';

type SaveAction = (formData: FormData) => Promise<void>;

function ActivityFields({ item }: { item?: AdminDailyActivity }) {
  return (
    <>
      {item ? <input type="hidden" name="activityId" value={item.activityId} /> : null}
      <label>
        Nome da atividade
        <input name="name" required defaultValue={item?.name} placeholder="Ex.: Reel mostrando o produto" />
      </label>
      <label>
        Plataforma
        <input name="platform" required defaultValue={item?.platform} placeholder="Instagram, TikTok ou Shopee" />
      </label>
      <label>
        Formato ou ação
        <input name="format" required defaultValue={item?.format} placeholder="Ex.: Reel, story ou live" />
      </label>
      <label>
        Pontos por envio
        <input name="points" required type="number" min="0" defaultValue={item?.points ?? 10} />
      </label>
      <label>
        Limite por dia
        <input name="dailyLimit" required type="number" min="1" defaultValue={item?.dailyLimit ?? 1} />
      </label>
      <label>
        Regras para a creator
        <textarea name="rules" required defaultValue={item?.rules} placeholder="Explique o que precisa aparecer no conteúdo." />
      </label>
      <label>
        <input name="active" type="checkbox" defaultChecked={item?.active ?? true} /> Publicar para as creators
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
  return (
    <div>
      <ScreenHeader
        kicker="Administração"
        title="Atividades diárias"
        intro="Configure atividades recorrentes, limites e regras. A aprovação usa os pontos cadastrados."
      />
      <Block title="Nova atividade">
        <form action={save} style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <ActivityFields />
          <button type="submit">Criar atividade</button>
        </form>
      </Block>
      <Block title="Atividades cadastradas">
        {!result.ok ? <p>{result.message}</p> : result.value.items.length === 0 ? (
          <p>Nenhuma atividade cadastrada. Crie a primeira acima.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {result.value.items.map((item) => (
              <details key={item.activityId} open={item.active}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  {item.name} · {item.active ? 'publicada' : 'desativada'}
                </summary>
                <form action={save} style={{ display: 'grid', gap: 12, maxWidth: 640, marginTop: 16 }}>
                  <ActivityFields item={item} />
                  <button type="submit">Salvar alterações</button>
                </form>
              </details>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}
