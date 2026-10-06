import Link from 'next/link';
import { ArrowRight, FileText, Image as ImageIcon } from 'lucide-react';
import { longDate, plural, shortDate } from '../domain/format';
import { formatPoints } from '../domain/points';
import {
  matchesSubmissionTab,
  submissionTabs,
  submissionView,
  type SubmissionTab,
} from '../domain/status';
import type { ContentEntry } from '../services/content';
import { Card } from './ui/card';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import { Tabs } from './ui/tabs';
import styles from '../styles/app.module.css';

const EMPTY: Record<SubmissionTab, { title: string; text: string; action?: boolean }> = {
  all: {
    title: 'Você ainda não enviou conteúdo.',
    text: 'Escolha um desafio, publique seu conteúdo nas redes e acompanhe o resultado por aqui.',
    action: true,
  },
  pending: {
    title: 'Nenhum envio em análise.',
    text: 'Assim que você enviar um conteúdo, ele aparece aqui enquanto a equipe NUY avalia.',
    action: true,
  },
  approved: {
    title: 'Nenhum conteúdo aprovado ainda.',
    text: 'Os envios aprovados ficam registrados aqui com os pontos conquistados.',
    action: true,
  },
  revision_requested: {
    title: 'Nenhum ajuste solicitado.',
    text: 'Se a equipe NUY pedir uma revisão no seu conteúdo, o pedido aparece nesta aba.',
  },
  rejected: {
    title: 'Nenhum conteúdo rejeitado.',
    text: 'Esta aba registra os envios que não seguiram as regras do desafio.',
  },
};

/**
 * Meus conteúdos — as submissões da própria usuária.
 *
 * O que aparece é o estado público do envio e o link da publicação. Nota,
 * motivo de moderação e quem avaliou não são exibidos: são registro interno da
 * equipe, não conteúdo de creator.
 */
export function ContentsScreen({
  entries,
  tab,
}: {
  entries: ContentEntry[] | null;
  tab: SubmissionTab;
}) {
  const counts = entries
    ? submissionTabs.map((entry) => ({
        ...entry,
        count: entries.filter((submission) => matchesSubmissionTab(submission.status, entry.id))
          .length,
      }))
    : submissionTabs;
  const items = entries?.filter((submission) => matchesSubmissionTab(submission.status, tab)) ?? [];
  const approvedPoints = entries
    ? entries
        .filter((submission) => submission.status === 'approved')
        .reduce((total, submission) => total + submission.challengePoints, 0)
    : 0;

  return (
    <>
      <ScreenHeader
        kicker="Meus conteúdos"
        title="Seus envios"
        intro="Cada conteúdo enviado nos desafios da comunidade, com o estado real da avaliação."
      />

      <Tabs
        items={counts}
        current={tab}
        href={(id) => `/app/conteudos?aba=${id}`}
        label="Filtrar conteúdos"
      />

      <Block>
        {entries === null ? (
          <UnavailableState what="seus conteúdos" />
        ) : items.length > 0 ? (
          <ul className={styles.list}>
            {items.map((submission) => (
              <li key={submission.id} className={styles.item}>
                <span className={styles.thumb} aria-hidden="true">
                  <ImageIcon size={18} />
                </span>
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <h3 className={styles.itemTitle}>
                      {submission.challengeSlug ? (
                        <Link href={`/app/desafios/${submission.challengeSlug}`}>
                          {submission.challengeName}
                        </Link>
                      ) : (
                        submission.challengeName || 'Desafio'
                      )}
                    </h3>
                    <Pill view={submissionView(submission.status)} />
                  </div>
                  <ul className={styles.metaRow}>
                    <li className={styles.metaItem}>
                      <FileText size={14} aria-hidden="true" />
                      {submission.revision > 1
                        ? `Revisão ${submission.revision}`
                        : 'Envio original'}
                    </li>
                    <li className={styles.metaItem}>
                      Enviado em {shortDate(submission.submittedAt)}
                    </li>
                    {submission.challengePoints > 0 ? (
                      <li className={styles.metaItem}>
                        {submission.status === 'approved'
                          ? `${formatPoints(submission.challengePoints)} Pontos NUY creditados`
                          : `Vale ${formatPoints(submission.challengePoints)} Pontos NUY`}
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className={styles.itemAside}>
                  {submission.url ? (
                    <a
                      href={submission.url}
                      className={styles.blockLink}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Abrir publicação
                    </a>
                  ) : (
                    <span className={styles.statHint}>Sem link registrado</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={EMPTY[tab].title}
            text={EMPTY[tab].text}
            action={
              EMPTY[tab].action ? (
                <Link
                  href="/app/desafios?aba=available"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Explorar desafios
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
        )}
      </Block>

      {entries && entries.length > 0 ? (
        <Block title="Resumo dos seus envios">
          <Card>
            <p>
              {plural(entries.length, 'envio registrado', 'envios registrados')}
              {approvedPoints > 0
                ? ` · ${formatPoints(approvedPoints)} Pontos NUY aprovados em desafios`
                : ''}
              .
            </p>
            {entries[0]?.submittedAt ? (
              <p className={styles.statHint}>Último envio em {longDate(entries[0].submittedAt)}.</p>
            ) : null}
          </Card>
        </Block>
      ) : null}
    </>
  );
}
