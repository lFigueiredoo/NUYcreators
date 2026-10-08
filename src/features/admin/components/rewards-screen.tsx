import Link from 'next/link';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import { Tabs } from '@/features/workspace/components/ui/tabs';
import { catalogView, wallClockValue } from '@/features/workspace/domain/catalog';
import type { AuditEntry, CatalogReward } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { CatalogTransitionForm, RewardForm, StockForm, type RewardFormValues } from './admin-forms';
import { stampIn } from './format';
import { AuditList } from './overview-screen';
import { Outcome, StatusPill, Table } from './shared';

export const rewardTabs = [
  { id: 'all', label: 'Todas' },
  { id: 'live', label: 'Ativas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'closed', label: 'Desativadas' },
] as const;

export type RewardTab = (typeof rewardTabs)[number]['id'];

export function parseRewardTab(value: string | string[] | undefined): RewardTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return rewardTabs.find((tab) => tab.id === raw)?.id ?? 'all';
}

export function RewardsScreen({
  status,
  rewards,
}: {
  status: RewardTab;
  rewards: AdminOutcome<{ items: CatalogReward[] }>;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Recompensas"
        intro="Rascunho não aparece no catálogo. Ativa aparece para quem tem saldo e estoque; desativada sai do ar sem invalidar resgate já feito."
        action={
          <Link
            href="/admin/recompensas/nova"
            className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          >
            Nova recompensa
          </Link>
        }
      />
      <Tabs
        items={rewardTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        current={status}
        href={(id) => (id === 'all' ? '/admin/recompensas' : `/admin/recompensas?estado=${id}`)}
        label="Estado da recompensa"
      />
      <Outcome result={rewards} what="a lista de recompensas">
        {(value) =>
          value.items.length === 0 ? (
            <EmptyState
              title={
                status === 'all'
                  ? 'Nenhuma recompensa cadastrada'
                  : 'Nenhuma recompensa neste estado'
              }
              text="Enquanto não houver recompensa ativa, a área das creators mostra o vazio dela — nada é preenchido com exemplo."
              action={
                <Link
                  href="/admin/recompensas/nova"
                  className={`${appStyles.button} ${appStyles.buttonPrimary}`}
                >
                  Criar a primeira recompensa
                </Link>
              }
            />
          ) : (
            <Table
              caption="Recompensas do catálogo"
              head={
                <>
                  <th>Recompensa</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className={styles.tableNum}>Pontos</th>
                  <th className={styles.tableNum}>Estoque</th>
                  <th className={styles.tableNum}>Resgatadas</th>
                  <th className={styles.tableNum}>Limite</th>
                  <th>Janela</th>
                  <th />
                </>
              }
            >
              {value.items.map((reward) => (
                <tr key={reward.rewardId}>
                  <td className={styles.tableWide}>
                    <Link
                      href={`/admin/recompensas/${reward.rewardId}`}
                      className={styles.tableLink}
                    >
                      {reward.name}
                    </Link>
                  </td>
                  <td>{reward.type}</td>
                  <td>
                    <StatusPill status={reward.status} />
                  </td>
                  <td className={styles.tableNum}>{reward.pointsCost}</td>
                  <td className={styles.tableNum}>{reward.stock}</td>
                  <td className={styles.tableNum}>{reward.redeemed}</td>
                  <td className={styles.tableNum}>{reward.perUserLimit}</td>
                  <td className={styles.tableNowrap}>
                    {stampIn(reward.startsAt)}
                    <br />
                    <span className={styles.tableMuted}>até {stampIn(reward.endsAt)}</span>
                  </td>
                  <td className={styles.tableNowrap}>
                    <Link
                      href={`/admin/recompensas/${reward.rewardId}`}
                      className={styles.tableLink}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Outcome>
      <p className={styles.counter}>
        A lista mostra as 100 recompensas com início mais recente. Estoque e contagem de resgates
        são lidos do banco na hora — nenhum dos dois é recalculado aqui.
      </p>
    </div>
  );
}

export function RewardDetailScreen({
  reward,
  timeZone,
  mediaEnabled,
}: {
  reward: AdminOutcome<{ item: (CatalogReward & { history: AuditEntry[] }) | null }>;
  timeZone: string;
  mediaEnabled: boolean;
}) {
  return (
    <Outcome result={reward} what="a recompensa">
      {(value) =>
        !value.item ? (
          <EmptyState
            title="Recompensa não encontrada"
            text="Ela pode ter sido removida. A lista de recompensas continua valendo."
            action={
              <Link
                href="/admin/recompensas"
                className={`${appStyles.button} ${appStyles.buttonGhost}`}
              >
                Voltar para a lista
              </Link>
            }
          />
        ) : (
          <RewardDetail reward={value.item} timeZone={timeZone} mediaEnabled={mediaEnabled} />
        )
      }
    </Outcome>
  );
}

function RewardDetail({
  reward,
  timeZone,
  mediaEnabled,
}: {
  reward: CatalogReward & { history: AuditEntry[] };
  timeZone: string;
  mediaEnabled: boolean;
}) {
  const view = catalogView(reward.status);
  const values: RewardFormValues = {
    rewardId: reward.rewardId,
    name: reward.name,
    type: reward.type,
    description: reward.description,
    pointsCost: String(reward.pointsCost),
    stock: String(reward.stock),
    perUserLimit: String(reward.perUserLimit),
    startsAt: wallClockValue(reward.startsAt, timeZone),
    endsAt: wallClockValue(reward.endsAt, timeZone),
    imageFileId: reward.imageFileId,
    version: reward.version,
  };

  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Recompensa"
        title={reward.name}
        intro={
          <>
            versão {reward.version} · {view.hint}
          </>
        }
        action={
          <div className={styles.actions}>
            <StatusPill status={reward.status} />
            <Link
              href="/app/recompensas"
              className={`${appStyles.button} ${appStyles.buttonGhost}`}
            >
              Ver como creator
            </Link>
          </div>
        }
      />

      <div className={styles.cols}>
        <div className={styles.stack}>
          <Block title="Editar">
            <RewardForm values={values} mediaEnabled={mediaEnabled} />
          </Block>
        </div>

        <div className={styles.stack}>
          <Block title="Estoque">
            <p className={styles.formHint}>
              O estoque é do servidor: ele baixa um a cada resgate no commit. Ajustar aqui é
              reposição ou correção — e é o motivo que explica o ajuste no histórico.
            </p>
            <StockForm rewardId={reward.rewardId} stock={reward.stock} version={reward.version} />
          </Block>

          <Block title="Estado">
            <p className={styles.formHint}>
              {reward.status === 'draft'
                ? 'Este é um rascunho: ele não aparece no catálogo das creators.'
                : reward.status === 'closed'
                  ? 'Desativada: sai do catálogo. Quem já resgatou continua com o resgate válido.'
                  : 'Ativa: aparece no catálogo para quem tem saldo, estoque e está dentro da janela.'}
            </p>
            <CatalogTransitionForm
              kind="reward"
              id={reward.rewardId}
              status={reward.status}
              version={reward.version}
            />
          </Block>

          <Block title="Números">
            <dl className={styles.meta}>
              <div>
                <dt>Resgates válidos</dt>
                <dd>{reward.redeemed}</dd>
              </div>
              <div>
                <dt>Estoque atual</dt>
                <dd>{reward.stock}</dd>
              </div>
              <div>
                <dt>Custo por resgate</dt>
                <dd>{reward.pointsCost} pontos</dd>
              </div>
              <div>
                <dt>Limite por creator</dt>
                <dd>{reward.perUserLimit}</dd>
              </div>
            </dl>
          </Block>

          <Block title="Histórico">
            <AuditList items={reward.history} />
          </Block>
        </div>
      </div>
    </div>
  );
}

export function NewRewardScreen({ mediaEnabled }: { mediaEnabled: boolean }) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Recompensa"
        title="Nova recompensa"
        intro="Salve como rascunho para revisar depois, ou ative de uma vez. O estoque inicial é o que você informar aqui; a partir daí, cada resgate baixa um no servidor."
      />
      <Block title="Dados da recompensa">
        <RewardForm mediaEnabled={mediaEnabled} />
      </Block>
      <p className={styles.counter}>
        O formulário grava os campos que o schema já tem, e nada além deles. Recompensa ativa com
        estoque zero aparece esgotada para as creators — o catálogo não esconde esse caso.
      </p>
    </div>
  );
}
