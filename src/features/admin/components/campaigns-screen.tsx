import Link from 'next/link';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import { wallClockValue } from '@/features/workspace/domain/catalog';
import type { CatalogCampaign } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { CampaignForm, type CampaignFormValues } from './admin-forms';
import { stampIn } from './format';
import { Outcome, StatusPill, Table } from './shared';

/**
 * Campanhas.
 *
 * O schema tem a tabela e nada mais: não existe regra publicada sobre o que uma
 * campanha FAZ — se dá bônus, se agrupa desafios, se muda pontos. Então esta tela
 * grava o que a operação informar e diz, na cara, que a semântica ainda não existe.
 * Inventar "bônus de campanha" aqui seria inventar regra de negócio.
 */
export function CampaignsScreen({
  campaigns,
  editing,
  timeZone,
}: {
  campaigns: AdminOutcome<{ items: CatalogCampaign[] }>;
  editing: string;
  timeZone: string;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Campanhas"
        intro="Agrupamento de desafios com período. Serve para organizar o catálogo e ler os relatórios por campanha."
      />

      <div className={styles.warn}>
        <p className={styles.warnText}>
          Campanha hoje é cadastro, não regra: nada no sistema dá pontos, desconto ou bônus por
          estar dentro de uma campanha. Se a regra de negócio for definida, ela entra no núcleo
          antes de qualquer tela prometer o efeito.
        </p>
      </div>

      <Outcome result={campaigns} what="a lista de campanhas">
        {(value) =>
          value.items.length === 0 ? (
            <EmptyState
              title="Nenhuma campanha cadastrada"
              text="Desafio pode existir sem campanha. Crie uma quando houver um agrupamento com nome e período para a equipe acompanhar."
            />
          ) : (
            <Table
              caption="Campanhas cadastradas"
              head={
                <>
                  <th>Campanha</th>
                  <th>Estado</th>
                  <th>Período</th>
                  <th className={styles.tableNum}>Desafios</th>
                  <th />
                </>
              }
            >
              {value.items.map((campaign) => (
                <tr key={campaign.campaignId}>
                  <td className={styles.tableWide}>
                    {campaign.name}
                    {campaign.description ? (
                      <span className={styles.tableMuted}> · {campaign.description}</span>
                    ) : null}
                  </td>
                  <td>
                    <StatusPill status={campaign.status} />
                  </td>
                  <td className={styles.tableNowrap}>
                    {stampIn(campaign.startsAt)}
                    <br />
                    <span className={styles.tableMuted}>até {stampIn(campaign.endsAt)}</span>
                  </td>
                  <td className={styles.tableNum}>{campaign.challenges}</td>
                  <td className={styles.tableNowrap}>
                    <Link
                      href={`/admin/campanhas?editar=${campaign.campaignId}`}
                      className={styles.tableLink}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Outcome>

      <CampaignEditor campaigns={campaigns} editing={editing} timeZone={timeZone} />

      <p className={styles.counter}>
        A contagem de desafios por campanha é feita sobre os 100 desafios mais recentes do catálogo
        — é a mesma lista que a tela de desafios mostra.
      </p>
    </div>
  );
}

/** Criar, ou editar a campanha escolhida na lista. Mesmo formulário, mesma ação. */
function CampaignEditor({
  campaigns,
  editing,
  timeZone,
}: {
  campaigns: AdminOutcome<{ items: CatalogCampaign[] }>;
  editing: string;
  timeZone: string;
}) {
  if (!campaigns.ok) return null;
  const current = editing
    ? (campaigns.value.items.find((campaign) => campaign.campaignId === editing) ?? null)
    : null;

  if (editing && !current)
    return (
      <Block title="Editar campanha">
        <p className={styles.formHint}>
          A campanha <code>{editing}</code> não está na lista carregada — ela pode ter sido
          removida, ou estar fora dos 100 registros mais recentes.
        </p>
        <Link href="/admin/campanhas" className={`${appStyles.button} ${appStyles.buttonGhost}`}>
          Fechar
        </Link>
      </Block>
    );

  const values: CampaignFormValues | undefined = current
    ? {
        campaignId: current.campaignId,
        name: current.name,
        description: current.description,
        startsAt: wallClockValue(current.startsAt, timeZone),
        endsAt: wallClockValue(current.endsAt, timeZone),
        status: current.status as CampaignFormValues['status'],
      }
    : undefined;

  return (
    <Block title={current ? `Editar ${current.name}` : 'Nova campanha'}>
      <CampaignForm values={values} />
      {current ? (
        <Link href="/admin/campanhas" className={styles.tableLink}>
          Cancelar edição
        </Link>
      ) : null}
    </Block>
  );
}
