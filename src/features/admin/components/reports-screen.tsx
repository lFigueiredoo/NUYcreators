import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { Tabs } from '@/features/workspace/components/ui/tabs';
import { submissionView } from '@/features/workspace/domain/status';
import type { ReportSummary } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import styles from '../styles/admin.module.css';
import { Outcome, Table } from './shared';

/**
 * Relatórios.
 *
 * Quatro leituras — números, tendência, estado e pontos — e nenhuma delas decorativa:
 * cada bloco responde a uma pergunta que a equipe faz ("quantas entraram", "está
 * subindo", "o que está parado", "quanto foi distribuído"). Onde a agregação tem
 * teto, a tela mostra "≥" em vez de arredondar para cima: número inventado é pior
 * do que número parcial declarado.
 */
export const reportPeriods = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: 0 },
] as const;

export type ReportPeriod = (typeof reportPeriods)[number]['id'];

export function parseReportPeriod(value: string | string[] | undefined): ReportPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return reportPeriods.find((period) => period.id === raw)?.id ?? '30';
}

export function reportDays(period: ReportPeriod): number {
  return reportPeriods.find((entry) => entry.id === period)?.days ?? 30;
}

function atLeast(value: number, truncated: boolean) {
  return truncated ? `≥ ${value}` : String(value);
}

function percent(value: number | null) {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

export function ReportsScreen({
  period,
  report,
}: {
  period: ReportPeriod;
  report: AdminOutcome<ReportSummary>;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Relatórios"
        intro="O que aconteceu no período, contado direto do banco. Zero é resposta: quando não houve movimento, o número é 0 e a tela não preenche o vazio."
      />
      <Tabs
        items={reportPeriods.map((entry) => ({ id: entry.id, label: entry.label }))}
        current={period}
        href={(id) => (id === '30' ? '/admin/relatorios' : `/admin/relatorios?periodo=${id}`)}
        label="Período do relatório"
      />

      <Outcome result={report} what="os números do período">
        {(value) => (
          <>
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Creators cadastradas</p>
                <p className={styles.kpiValue}>{value.creators.total}</p>
                <p className={styles.kpiHint}>{value.creators.onboardedInPeriod} no período</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Creators ativas</p>
                <p className={styles.kpiValue}>
                  {atLeast(value.activeCreators.total, value.activeCreators.sampled)}
                </p>
                <p className={styles.kpiHint}>Enviaram conteúdo no período</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Participações</p>
                <p className={styles.kpiValue}>{value.participations.inPeriod}</p>
                <p className={styles.kpiHint}>Entradas em desafios no período</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Envios</p>
                <p className={styles.kpiValue}>{value.submissions.inPeriod}</p>
                <p className={styles.kpiHint}>Conteúdos enviados no período</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Taxa de aprovação</p>
                <p className={styles.kpiValue}>{percent(value.approvalRate)}</p>
                <p className={styles.kpiHint}>Aprovados ÷ (aprovados + recusados)</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Desafios no ar</p>
                <p className={styles.kpiValue}>{value.challenges.live}</p>
                <p className={styles.kpiHint}>
                  {value.challenges.startedInPeriod} começaram no período
                </p>
              </div>
            </div>

            <div className={styles.cols}>
              <div className={styles.stack}>
                <Block title="Envios por semana">
                  <WeeklyBars weeks={value.weeks} />
                  <p className={styles.formHint}>
                    Contagem por data de envio, do alto para baixo: a semana mais antiga vem
                    primeiro e a mais recente fecha a série.
                  </p>
                </Block>

                <Block title="Envios por estado no período">
                  <Table
                    caption="Envios do período por estado"
                    head={
                      <>
                        <th>Estado</th>
                        <th className={styles.tableNum}>Envios</th>
                      </>
                    }
                  >
                    {(
                      [
                        ['pending', value.submissions.pending],
                        ['revision_requested', value.submissions.revisionRequested],
                        ['approved', value.submissions.approved],
                        ['rejected', value.submissions.rejected],
                      ] as const
                    ).map(([status, count]) => (
                      <tr key={status}>
                        <td>{submissionView(status).label}</td>
                        <td className={styles.tableNum}>{count}</td>
                      </tr>
                    ))}
                  </Table>
                  {value.submissions.sampleTruncated ? (
                    <p className={styles.counter}>
                      A soma das linhas passou do teto de leitura em memória (1.000): os totais por
                      estado são o que foi lido até ali, e a tendência abaixo vale para o mesmo
                      recorte. O total do período continua sendo a contagem exata do banco.
                    </p>
                  ) : null}
                </Block>
              </div>

              <div className={styles.stack}>
                <Block title="Pontos no período">
                  <dl className={styles.meta}>
                    <div>
                      <dt>Concedidos</dt>
                      <dd>{atLeast(value.points.granted, value.points.truncated)}</dd>
                    </div>
                    <div>
                      <dt>Resgatados</dt>
                      <dd>{atLeast(value.points.redeemed, value.points.truncated)}</dd>
                    </div>
                  </dl>
                  <p className={styles.formHint}>
                    Soma do extrato de pontos no período. Concedidos menos resgatados é o saldo que
                    entrou no sistema — não é o saldo disponível das creators, que continua no
                    extrato de cada uma.
                  </p>
                </Block>

                <Block title="Resgates">
                  <Table
                    caption="Resgates do período e fila"
                    head={
                      <>
                        <th>Situação</th>
                        <th className={styles.tableNum}>Quantidade</th>
                      </>
                    }
                  >
                    <tr>
                      <td>Solicitados no período</td>
                      <td className={styles.tableNum}>{value.redemptions.inPeriod}</td>
                    </tr>
                    <tr>
                      <td>Aguardando ação da equipe</td>
                      <td className={styles.tableNum}>{value.redemptions.requested}</td>
                    </tr>
                    <tr>
                      <td>Em processamento</td>
                      <td className={styles.tableNum}>{value.redemptions.processing}</td>
                    </tr>
                    <tr>
                      <td>Entregues no período</td>
                      <td className={styles.tableNum}>{value.redemptions.delivered}</td>
                    </tr>
                  </Table>
                  <p className={styles.formHint}>
                    A fila (aguardando e em processamento) é do acervo inteiro, não do período: o
                    que está parado agora é o que precisa de alguém agora.
                  </p>
                </Block>

                <Block title="Desafios">
                  <dl className={styles.meta}>
                    <div>
                      <dt>No ar</dt>
                      <dd>{value.challenges.live}</dd>
                    </div>
                    <div>
                      <dt>Começaram no período</dt>
                      <dd>{value.challenges.startedInPeriod}</dd>
                    </div>
                    <div>
                      <dt>Encerrados (acervo)</dt>
                      <dd>{value.challenges.closed}</dd>
                    </div>
                  </dl>
                  <p className={styles.formHint}>
                    Desafio encerrado não guarda a data do encerramento no schema, então este número
                    é do acervo inteiro, não do período.
                  </p>
                </Block>
              </div>
            </div>
          </>
        )}
      </Outcome>
    </div>
  );
}

/** Tendência: barra proporcional ao maior valor da série. Zero fica sem barra. */
function WeeklyBars({ weeks }: { weeks: ReportSummary['weeks'] }) {
  const max = weeks.reduce((highest, week) => Math.max(highest, week.submissions), 0);
  if (!weeks.length)
    return <p className={styles.formHint}>Sem série para mostrar neste período.</p>;
  return (
    <div className={styles.bars}>
      {weeks.map((week) => (
        <div key={week.label} className={styles.barRow}>
          <p className={styles.barLabel}>{week.label}</p>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: max > 0 ? `${(week.submissions / max) * 100}%` : '0%' }}
            />
          </div>
          <p className={styles.barValue}>{week.submissions}</p>
        </div>
      ))}
    </div>
  );
}
