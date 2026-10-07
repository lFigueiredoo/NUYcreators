import Link from 'next/link';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import type { AuditEntry } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { auditActionLabel, entityLabel } from './audit';
import { stampIn } from './format';
import { Kpi, Outcome, Table } from './shared';

/**
 * Visão geral.
 *
 * Cinco números do dia a dia (o que está no ar, o que espera decisão, quantas
 * creators existem) com link para a tela que age sobre cada um, e o rastro das
 * últimas ações administrativas. Nada aqui é decorativo: cada bloco leva a um
 * lugar onde a equipe faz alguma coisa.
 */
export function OverviewScreen({
  overview,
  audit,
}: {
  overview: AdminOutcome<Record<string, number>>;
  audit: AdminOutcome<{ items: AuditEntry[] }>;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Visão geral"
        intro="Contagem exata do banco. Zero é resposta: significa que não existe nenhum registro naquele estado."
      />
      <Outcome result={overview} what="os números da operação">
        {(counts) => (
          <>
            <div className={styles.kpis}>
              <Kpi
                label="Desafios ativos"
                value={counts.challengesLive}
                hint="Publicados e dentro da janela"
                href="/admin/desafios?estado=live"
              />
              <Kpi
                label="Submissões pendentes"
                value={counts.submissionsPending}
                hint="Aguardando decisão"
                href="/admin/submissoes?estado=pending"
              />
              <Kpi
                label="Creators cadastradas"
                value={counts.creators}
                hint="Com onboarding concluído"
                href="/admin/creators"
              />
              <Kpi
                label="Resgates pendentes"
                value={counts.redemptionsRequested}
                hint="Solicitados, sem tratamento"
                href="/admin/relatorios"
              />
              <Kpi
                label="Recompensas ativas"
                value={counts.rewardsLive}
                hint="No catálogo das creators"
                href="/admin/recompensas?estado=live"
              />
            </div>

            <div className={styles.cols}>
              <Block title="O que espera a equipe">
                <Table
                  caption="Fila de trabalho da administração"
                  head={
                    <>
                      <th>Frente</th>
                      <th className={styles.tableNum}>Abertos</th>
                      <th>Abrir</th>
                    </>
                  }
                >
                  <tr>
                    <td>Envios aguardando decisão</td>
                    <td className={styles.tableNum}>{counts.submissionsPending}</td>
                    <td>
                      <Link className={styles.tableLink} href="/admin/submissoes?estado=pending">
                        Moderar
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Envios com revisão solicitada</td>
                    <td className={styles.tableNum}>{counts.submissionsRevision}</td>
                    <td>
                      <Link
                        className={styles.tableLink}
                        href="/admin/submissoes?estado=revision_requested"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Resgates solicitados</td>
                    <td className={styles.tableNum}>{counts.redemptionsRequested}</td>
                    <td className={styles.tableMuted}>Sem tela de expedição</td>
                  </tr>
                  <tr>
                    <td>Resgates em processamento</td>
                    <td className={styles.tableNum}>{counts.redemptionsProcessing}</td>
                    <td className={styles.tableMuted}>Sem tela de expedição</td>
                  </tr>
                  <tr>
                    <td>Desafios em rascunho</td>
                    <td className={styles.tableNum}>{counts.challengesDraft}</td>
                    <td>
                      <Link className={styles.tableLink} href="/admin/desafios?estado=draft">
                        Revisar
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Recompensas em rascunho</td>
                    <td className={styles.tableNum}>{counts.rewardsDraft}</td>
                    <td>
                      <Link className={styles.tableLink} href="/admin/recompensas?estado=draft">
                        Revisar
                      </Link>
                    </td>
                  </tr>
                </Table>
                <p className={styles.formHint}>
                  Resgate ainda não tem tela de expedição: o status existe no schema e o valor está
                  contado, mas mudar o status de um resgate ainda não é operação desta tela.
                </p>
              </Block>

              <Block
                title="Últimas ações administrativas"
                link={
                  <Link className={styles.tableLink} href="/admin/relatorios">
                    Relatórios
                  </Link>
                }
              >
                <Outcome result={audit} what="as últimas ações administrativas">
                  {(value) =>
                    value.items.length ? (
                      <ul className={styles.timeline}>
                        {value.items.map((entry) => (
                          <li key={entry.id} className={styles.timelineItem}>
                            <p className={styles.timelineHead}>{auditActionLabel(entry.action)}</p>
                            <p className={styles.timelineMeta}>
                              {entityLabel(entry.entityType)} · {entry.entityId.slice(0, 12)} ·{' '}
                              {stampIn(entry.occurredAt)}
                            </p>
                            {entry.reason ? (
                              <p className={styles.timelineReason}>{entry.reason}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title="Nenhuma ação registrada ainda"
                        text="Criar, editar, publicar e encerrar aparecem aqui, com quem fez e quando."
                      />
                    )
                  }
                </Outcome>
              </Block>
            </div>
          </>
        )}
      </Outcome>
    </div>
  );
}

/** Esqueleto da visão geral: mesma grade, sem número inventado. */
export function OverviewSkeleton() {
  return (
    <div className={styles.stack} aria-hidden="true">
      <div className={styles.kpis}>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={styles.kpi}>
            <div
              className={`${appStyles.skeleton} ${appStyles.skeletonLine}`}
              style={{ width: '60%' }}
            />
            <div
              className={`${appStyles.skeleton} ${appStyles.skeletonLine}`}
              style={{ width: '35%' }}
            />
          </div>
        ))}
      </div>
      <div className={appStyles.card}>
        <div
          className={`${appStyles.skeleton} ${appStyles.skeletonLine}`}
          style={{ width: '30%' }}
        />
        <div className={`${appStyles.skeleton} ${appStyles.skeletonLine}`} />
        <div
          className={`${appStyles.skeleton} ${appStyles.skeletonLine}`}
          style={{ width: '70%' }}
        />
      </div>
    </div>
  );
}

/** Tabela de auditoria completa, usada nos detalhes (desafio, recompensa). */
export function AuditList({ items }: { items: AuditEntry[] }) {
  if (!items.length)
    return (
      <EmptyState
        title="Sem histórico para este registro"
        text="As ações desta rodada em diante aparecem aqui, com autor e motivo."
      />
    );
  return (
    <Table
      caption="Histórico de ações administrativas do registro"
      head={
        <>
          <th>Ação</th>
          <th>Quando</th>
          <th>Motivo</th>
        </>
      }
    >
      {items.map((entry) => (
        <tr key={entry.id}>
          <td>
            {auditActionLabel(entry.action)}
            {entry.correlationId ? (
              <span className={styles.tableMuted}> · {entry.correlationId.slice(0, 8)}</span>
            ) : null}
          </td>
          <td className={styles.tableNowrap}>{stampIn(entry.occurredAt)}</td>
          <td>{entry.reason || <span className={styles.tableMuted}>—</span>}</td>
        </tr>
      ))}
    </Table>
  );
}
