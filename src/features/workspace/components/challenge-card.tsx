import Link from 'next/link';
import { Coins } from 'lucide-react';
import { deadlineLabel, shortDate } from '../domain/format';
import { formatPoints } from '../domain/points';
import { challengeBucket, participationView, submissionView } from '../domain/status';
import type { ChallengeView } from '../services/challenges';
import { Pill } from './ui/pill';
import styles from '../styles/app.module.css';

/**
 * CTA por estado real da participação — nada de "Participar" em desafio em que
 * a pessoa já está participando, e nada de ação que o backend ainda não aceita.
 */
function actionLabel(challenge: ChallengeView) {
  switch (challenge.bucket) {
    case 'joined':
      return 'Continuar';
    case 'in_review':
      return 'Ver envio';
    case 'done':
      return 'Ver desafio';
    default:
      return 'Ver desafio';
  }
}

function statePill(challenge: ChallengeView) {
  if (challenge.submission) return submissionView(challenge.submission.status);
  if (challenge.participation) return participationView(challenge.participation.status);
  return null;
}

/**
 * Miniatura determinística (inicial do nome). Sem banco de mídia público
 * definido para desafios, não inventamos imagem nem buscamos arquivo privado.
 */
export function ChallengeThumb({ name }: { name: string }) {
  return (
    <span className={styles.thumb} aria-hidden="true">
      {(name.trim()[0] ?? 'N').toUpperCase()}
    </span>
  );
}

export function ChallengeCard({ challenge, now }: { challenge: ChallengeView; now: Date }) {
  const deadline = deadlineLabel(challenge.endsAt, now);
  const pill = statePill(challenge);
  return (
    <article className={styles.challengeCard}>
      <Link
        href={`/app/desafios/${challenge.slug}`}
        className={`${styles.challengeMedia} ${challenge.imageFileId ? '' : styles.challengeMediaEmpty}`}
      >
        <span aria-hidden="true">{(challenge.name.trim()[0] ?? 'N').toUpperCase()}</span>
      </Link>
      <div className={styles.challengeBody}>
        <div className={styles.challengeTop}>
          <p className={styles.points}>
            <Coins size={15} aria-hidden="true" />
            {formatPoints(challenge.points)} Pontos NUY
          </p>
          {pill ? <Pill view={pill} /> : null}
        </div>
        <h3 className={styles.challengeTitle}>
          <Link href={`/app/desafios/${challenge.slug}`}>{challenge.name}</Link>
        </h3>
        {challenge.description ? (
          <p className={styles.challengeText}>{challenge.description}</p>
        ) : null}
        <div className={styles.challengeFoot}>
          {deadline ? <span className={styles.deadline}>{deadline}</span> : <span />}
          <Link href={`/app/desafios/${challenge.slug}`} className={styles.challengeAction}>
            {actionLabel(challenge)}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Linha compacta usada nas listas de "continuar participando". */
export function ChallengeRow({ challenge, now }: { challenge: ChallengeView; now: Date }) {
  const pill = statePill(challenge) ?? {
    label: challengeBucket(challenge) === 'available' ? 'Disponível' : 'Participando',
    tone: 'neutral' as const,
  };
  const deadline = deadlineLabel(challenge.endsAt, now);
  return (
    <li className={styles.item}>
      <ChallengeThumb name={challenge.name} />
      <div className={styles.itemMain}>
        <div className={styles.itemHead}>
          <h3 className={styles.itemTitle}>
            <Link href={`/app/desafios/${challenge.slug}`}>{challenge.name}</Link>
          </h3>
          <Pill view={pill} />
        </div>
        <ul className={styles.metaRow}>
          <li className={styles.metaItem}>
            <Coins size={14} aria-hidden="true" />
            {formatPoints(challenge.points)} Pontos NUY
          </li>
          {deadline ? <li className={styles.metaItem}>{deadline}</li> : null}
          {challenge.submission ? (
            <li className={styles.metaItem}>
              Enviado em {shortDate(challenge.submission.submittedAt)}
            </li>
          ) : null}
        </ul>
      </div>
      <div className={styles.itemAside}>
        <Link href={`/app/desafios/${challenge.slug}`} className={styles.blockLink}>
          {actionLabel(challenge)}
        </Link>
      </div>
    </li>
  );
}
