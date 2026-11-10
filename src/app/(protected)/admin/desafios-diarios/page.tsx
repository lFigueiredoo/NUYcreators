import { revalidatePath } from 'next/cache';
import { ScreenHeader, Block } from '@/features/workspace/components/ui/screen';
import { loadDailyActivities, commandSaveDailyActivity } from '@/features/admin/services/console';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Desafios diários' };

async function save(form: FormData) {
  'use server';
  await requireStaff('manage-catalog');
  await commandSaveDailyActivity({
    activityId: String(form.get('activityId') || ''),
    name: String(form.get('name') || ''),
    platform: String(form.get('platform') || ''),
    format: String(form.get('format') || ''),
    points: Number(form.get('points') || 0),
    dailyLimit: Number(form.get('dailyLimit') || 1),
    active: form.get('active') === 'on',
    rules: String(form.get('rules') || ''),
  });
  revalidatePath('/admin/desafios-diarios');
  revalidatePath('/app/desafios');
}

export default async function DailyActivitiesPage() {
  await requireStaff('manage-catalog');
  const result = await loadDailyActivities();
  return (
    <div>
      <ScreenHeader kicker="Administração" title="Atividades diárias"
        intro="Configure atividades recorrentes, limites e regras. A aprovação usa os pontos cadastrados." />
      <Block title="Nova atividade">
        <form action={save} style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <label>
            Nome da atividade
            <input name="name" required placeholder="Ex.: Reel mostrando o produto" />
          </label>
          <label>
            Plataforma
            <input name="platform" required placeholder="Instagram, TikTok ou Shopee" />
          </label>
          <label>
            Formato ou ação
            <input name="format" required placeholder="Ex.: Reel, story ou live" />
          </label>
          <label>
            Pontos por envio
            <input name="points" required type="number" min="0" defaultValue="10" />
          </label>
          <label>
            Limite por dia
            <input name="dailyLimit" required type="number" min="1" defaultValue="1" />
          </label>
          <label>
            Regras para a creator
            <textarea name="rules" required placeholder="Explique o que precisa aparecer no conteúdo." />
          </label>
          <label><input name="active" type="checkbox" defaultChecked /> Publicar para as creators</label>
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
                  <input type="hidden" name="activityId" value={item.activityId} />
                  <label>
                    Nome da atividade
                    <input name="name" required defaultValue={item.name} />
                  </label>
                  <label>
                    Plataforma
                    <input name="platform" required defaultValue={item.platform} />
                  </label>
                  <label>
                    Formato ou ação
                    <input name="format" required defaultValue={item.format} />
                  </label>
                  <label>
                    Pontos por envio
                    <input name="points" required type="number" min="0" defaultValue={item.points} />
                  </label>
                  <label>
                    Limite por dia
                    <input name="dailyLimit" required type="number" min="1" defaultValue={item.dailyLimit} />
                  </label>
                  <label>
                    Regras para a creator
                    <textarea name="rules" required defaultValue={item.rules} />
                  </label>
                  <label>
                    <input name="active" type="checkbox" defaultChecked={item.active} /> Publicar para as creators
                  </label>
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
