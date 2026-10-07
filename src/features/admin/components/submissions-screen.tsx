import Link from 'next/link';
import { ModerationDecisionForm } from '@/features/workspace/components/core-forms';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import { submissionView } from '@/features/workspace/domain/status';
import type {
  AdminSubmission,
  AdminSubmissionDetail,
  CatalogChallenge,
} from '@/features/workspace/core';
import { Pill } from '@/features/workspace/components/ui/pill';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { stampIn } from './format';
import { Outcome, Table } from './shared';

/**
 * Os quatro estados que o núcleo escreve em `challenge_submissions.status`
 * (`domain/status.ts`). Nenhum estado novo é oferecido aqui só para caber numa
 * lista de filtros: o que a tela oferece é o que o banco pode conter.
 */
const STATUSES = ['pending', 'approved', 'revision_requested', 'rejected'] as const;

export type SubmissionFilters = {
  status: string;
  challengeId: string;
  userId: string;
  from: string;
  to: string;
};

export function SubmissionsScreen({
  submissions,
  challenges,
  filters,
}: {
  submissions: AdminOutcome<{ items: AdminSubmission[] }>;
  challenges: AdminOutcome<{ items: CatalogChallenge[] }>;
  filters: SubmissionFilters;
}) {
  const filtered = Boolean(
    filters.status !== 'all' || filters.challengeId || filters.userId || filters.from || filters.to,
  );
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Submissões"
        intro="Tudo o que as creators enviaram, com o estado em que está. A decisão acontece na tela de cada envio."
      />

      <form className={styles.filters} method="get" action="/admin/submissoes">
        <div className={styles.filterField}>
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" name="estado" defaultValue={filters.status}>
            <option value="all">Todos os estados</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {submissionView(status).label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label htmlFor="filtro-desafio">Desafio</label>
          {challenges.ok ? (
            <select id="filtro-desafio" name="desafio" defaultValue={filters.challengeId}>
              <option value="">Todos os desafios</option>
              {challenges.value.items.map((challenge) => (
                <option key={challenge.challengeId} value={challenge.challengeId}>
                  {challenge.name}
                </option>
              ))}
            </select>
          ) : (
            // Sem leitura do catálogo (papel só de moderação), o filtro continua
            // existindo — por id, que é o que o banco filtra.
            <input
              id="filtro-desafio"
              name="desafio"
              defaultValue={filters.challengeId}
              placeholder="id do desafio"
              maxLength={36}
            />
          )}
        </div>

        <div className={styles.filterField}>
          <label htmlFor="filtro-criadora">Criadora (id)</label>
          <input
            id="filtro-criadora"
            name="criadora"
            defaultValue={filters.userId}
            placeholder="id da conta"
            maxLength={36}
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="filtro-de">Enviados de</label>
          <input id="filtro-de" name="de" type="date" defaultValue={filters.from} />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="filtro-ate">até</label>
          <input id="filtro-ate" name="ate" type="date" defaultValue={filters.to} />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={`${appStyles.button} ${appStyles.buttonGhost}`}>
            Filtrar
          </button>
          {filtered ? (
            <Link href="/admin/submissoes" className={styles.tableLink}>
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      <Outcome result={submissions} what="a lista de submissões">
        {(value) =>
          value.items.length === 0 ? (
            <EmptyState
              title={filtered ? 'Nenhum envio com estes filtros' : 'Nenhum envio ainda'}
              text={
                filtered
                  ? 'Ajuste o período ou o estado para ver outros envios.'
                  : 'Quando uma creator enviar conteúdo, ele aparece aqui para decisão.'
              }
            />
          ) : (
            <Table
              caption="Submissões das creators"
              head={
                <>
                  <th>Criadora</th>
                  <th>Desafio</th>
                  <th>Estado</th>
                  <th>Enviado em</th>
                  <th className={styles.tableNum}>Revisão</th>
                  <th />
                </>
              }
            >
              {value.items.map((submission) => (
                <tr key={submission.submissionId}>
                  <td>
                    <Link
                      href={`/admin/creators/${submission.userId}`}
                      className={styles.tableLink}
                    >
                      {submission.creatorName}
                    </Link>
                  </td>
                  <td className={styles.tableWide}>
                    <Link
                      href={`/admin/desafios/${submission.challengeId}`}
                      className={styles.tableLink}
                    >
                      {submission.challengeName}
                    </Link>
                  </td>
                  <td>
                    <Pill view={submissionView(submission.status)} />
                  </td>
                  <td className={styles.tableNowrap}>{stampIn(submission.submittedAt)}</td>
                  <td className={styles.tableNum}>{submission.revision}</td>
                  <td className={styles.tableNowrap}>
                    <Link
                      href={`/admin/submissoes/${submission.submissionId}`}
                      className={styles.tableLink}
                    >
                      Analisar
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Outcome>
      <p className={styles.counter}>
        A lista mostra os 100 envios mais recentes. Os filtros valem no banco; recuse um envio com
        motivo, porque é o motivo que a criadora lê.
      </p>
    </div>
  );
}

/** Um envio: o conteúdo, o contexto e a decisão — a mesma porta da moderação. */
export function SubmissionDetailScreen({
  submission,
}: {
  submission: AdminOutcome<{ item: AdminSubmissionDetail | null }>;
}) {
  return (
    <Outcome result={submission} what="o envio">
      {(value) =>
        !value.item ? (
          <EmptyState
            title="Envio não encontrado"
            text="Ele pode ter sido removido. A lista de submissões continua valendo."
            action={
              <Link
                href="/admin/submissoes"
                className={`${appStyles.button} ${appStyles.buttonGhost}`}
              >
                Voltar para a lista
              </Link>
            }
          />
        ) : (
          <SubmissionDetail submission={value.item} />
        )
      }
    </Outcome>
  );
}

function SubmissionDetail({ submission }: { submission: AdminSubmissionDetail }) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Envio"
        title={submission.challengeName}
        intro={`Enviado em ${stampIn(submission.submittedAt)} · revisão ${submission.revision}`}
        action={<Pill view={submissionView(submission.status)} />}
      />

      <div className={styles.cols}>
        <div className={styles.stack}>
          <Block title="Conteúdo enviado">
            {submission.url ? (
              <p>
                <a
                  className={styles.tableLink}
                  href={submission.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {submission.url}
                </a>
              </p>
            ) : (
              <p className={styles.formHint}>
                Este envio não tem link canônico gravado — a creator enviou apenas a publicação
                declarada, sem URL.
              </p>
            )}
            <dl className={styles.meta}>
              <div>
                <dt>Criadora</dt>
                <dd>
                  <Link className={styles.tableLink} href={`/admin/creators/${submission.userId}`}>
                    {submission.creatorName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Desafio</dt>
                <dd>
                  <Link
                    className={styles.tableLink}
                    href={`/admin/desafios/${submission.challengeId}`}
                  >
                    {submission.challengeName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Plataforma</dt>
                <dd>{submission.platform || '—'}</dd>
              </div>
              <div>
                <dt>Pontos do desafio</dt>
                <dd>{submission.challengePoints}</dd>
              </div>
              <div>
                <dt>Revisado em</dt>
                <dd>{stampIn(submission.reviewedAt)}</dd>
              </div>
              <div>
                <dt>Revisado por</dt>
                <dd>{submission.reviewedBy || '—'}</dd>
              </div>
            </dl>
            <p className={styles.formHint}>
              Impressão do conteúdo (bloqueia reenvio do mesmo link):{' '}
              {submission.contentFingerprint}
            </p>
            {submission.moderationReason ? (
              <div className={styles.warn}>
                <p className={styles.warnText}>
                  Motivo registrado na última decisão: {submission.moderationReason}
                </p>
              </div>
            ) : null}
          </Block>

          <Block title="Histórico do envio">
            {submission.history.length ? (
              <Table
                caption="Histórico de decisões deste envio"
                head={
                  <>
                    <th>De</th>
                    <th>Para</th>
                    <th>Revisão</th>
                    <th>Quando</th>
                    <th>Motivo</th>
                  </>
                }
              >
                {submission.history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{submissionView(entry.previousStatus).label}</td>
                    <td>{submissionView(entry.nextStatus).label}</td>
                    <td className={styles.tableNum}>{entry.revision}</td>
                    <td className={styles.tableNowrap}>{stampIn(entry.occurredAt)}</td>
                    <td>{entry.reason || <span className={styles.tableMuted}>—</span>}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="Sem decisão registrada"
                text="Este envio ainda está como chegou. A decisão abaixo entra neste histórico."
              />
            )}
          </Block>
        </div>

        <div className={styles.stack}>
          <Block title="Decisão">
            <p className={styles.formHint}>
              Aprovar credita os pontos do desafio uma única vez. Recusar ou pedir revisão exige
              motivo — é o que a criadora lê.
            </p>
            <ModerationDecisionForm
              submissionId={submission.submissionId}
              expectedRevision={submission.revision}
            />
          </Block>
          <Block title="Requisitos do desafio">
            <p className={styles.formHint}>
              O que este conteúdo precisava cumprir está na página do desafio, junto do texto que a
              creator leu.
            </p>
            <Link
              className={`${appStyles.button} ${appStyles.buttonGhost}`}
              href={`/admin/desafios/${submission.challengeId}`}
            >
              Abrir o desafio
            </Link>
          </Block>
        </div>
      </div>
    </div>
  );
}
