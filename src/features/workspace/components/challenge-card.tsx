import Link from 'next/link';
import { Coins } from 'lucide-react';
import { deadlineLabel, notStarted, shortDate, startLabel } from '../domain/format';
import { formatPoints } from '../domain/points';
import { COMING_VIEW, challengeBucket, participationView, submissionView } from '../domain/status';
import type { ChallengeView } from '../services/challenges';
import { CardMedia, CoverFallback } from './ui/card';
import { Pill } from './ui/pill';
import styles from '../styles/app.module.css';

/**
 * CTA por estado real da participação — nada de "Participar" em desafio em que
 * a pessoa já está participando, e nada de ação que o backend ainda não aceita.
 *
 * O desafio que ainda não começou também cai em "Ver desafio": ele se lê, o
 * briefing está lá — o que não existe é a entrada, e essa quem nega é o servidor.
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
 * Miniatura da LINHA compacta: a inicial do nome, por escolha.
 *
 * A linha existe para varrer vários itens de uma vez, e a inicial lê melhor nesse
 * tamanho do que uma foto reduzida. O cartão e o detalhe, que têm espaço, mostram
 * a imagem de verdade (`CatalogMedia`).
 */
export function ChallengeThumb({ name }: { name: string }) {
  return (
    <span className={styles.thumb} aria-hidden="true">
      {(name.trim()[0] ?? 'N').toUpperCase()}
    </span>
  );
}

/**
 * O conteúdo do cartão de desafio, igual nas duas formas — só o corpo e o
 * tamanho do título mudam. Escrever isto duas vezes seria a garantia de que uma
 * das formas ficaria para trás no próximo campo.
 */
function ChallengeBody({
  challenge,
  pill,
  deadline,
  coming,
  feature,
}: {
  challenge: ChallengeView;
  pill: ReturnType<typeof statePill>;
  deadline: string | null;
  /** Janela ainda fechada: o selo e a data do rodapé trocam de assunto. */
  coming: boolean;
  feature: boolean;
}) {
  const href = `/app/desafios/${challenge.slug}`;
  // O selo de estado é o do desfecho real (envio/participação); sem desfecho e
  // com a janela fechada, o estado É "Em breve" — nunca um cartão mudo que se lê
  // como disponível para entrar agora.
  const badge = pill ?? (coming ? COMING_VIEW : null);
  // No rodapé, o que interessa a quem ainda não pode entrar é QUANDO abre; a data
  // final continua na página do desafio, no bloco de prazo.
  const when = coming ? startLabel(challenge.startsAt) : deadline;
  return (
    <div className={feature ? styles.featureBody : styles.challengeBody}>
      <div className={styles.challengeTop}>
        <p className={styles.points}>
          <Coins size={15} aria-hidden="true" />
          {formatPoints(challenge.points)} Pontos NUY
        </p>
        {badge ? <Pill view={badge} /> : null}
      </div>
      <h3 className={feature ? styles.featureTitle : styles.challengeTitle}>
        <Link href={href}>{challenge.name}</Link>
      </h3>
      {challenge.description ? (
        <p className={styles.challengeText}>{challenge.description}</p>
      ) : null}
      <div className={styles.challengeFoot}>
        {when ? <span className={styles.deadline}>{when}</span> : <span />}
        <Link href={href} className={styles.challengeAction}>
          {actionLabel(challenge)}
        </Link>
      </div>
    </div>
  );
}

/**
 * Cartão do desafio em duas formas: em pé na grade, deitado no destaque do
 * painel — onde a imagem ocupa a coluna da esquerda (~45% da largura) e o texto
 * fica ao lado dela.
 */
export function ChallengeCard({
  challenge,
  now,
  feature = false,
}: {
  challenge: ChallengeView;
  now: Date;
  feature?: boolean;
}) {
  const deadline = deadlineLabel(challenge.endsAt, now);
  const coming = notStarted(challenge.startsAt, now);
  const pill = statePill(challenge);
  const href = `/app/desafios/${challenge.slug}`;
  // A composição institucional vale para os dois casos de ausência de foto: a
  // linha não tem imagem gravada, ou o arquivo dela não pôde ser entregue. Quem
  // decide isso é o `CatalogMedia` — aqui a capa é sempre passada.
  const cover = <CoverFallback />;
  if (feature)
    return (
      <article className={styles.featureCard}>
        <CardMedia
          fileId={challenge.imageFileId}
          name={challenge.name}
          href={href}
          className={styles.featureMedia}
          cover={cover}
        />
        <ChallengeBody
          challenge={challenge}
          pill={pill}
          deadline={deadline}
          coming={coming}
          feature
        />
      </article>
    );
  return (
    <article className={styles.challengeCard}>
      <CardMedia
        fileId={challenge.imageFileId}
        name={challenge.name}
        href={href}
        className={styles.challengeMedia}
        cover={cover}
      />
      <ChallengeBody
        challenge={challenge}
        pill={pill}
        deadline={deadline}
        coming={coming}
        feature={false}
      />
    </article>
  );
}

/** Linha compacta usada nas listas de "continuar participando". */
export function ChallengeRow({ challenge, now }: { challenge: ChallengeView; now: Date }) {
  const coming = notStarted(challenge.startsAt, now);
  const pill =
    statePill(challenge) ??
    (coming
      ? COMING_VIEW
      : {
          label: challengeBucket(challenge) === 'available' ? 'Disponível' : 'Participando',
          tone: 'neutral' as const,
        });
  const when = coming ? startLabel(challenge.startsAt) : deadlineLabel(challenge.endsAt, now);
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
          {when ? <li className={styles.metaItem}>{when}</li> : null}
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
