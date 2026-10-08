import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarClock, Coins, Compass, Inbox, Search } from 'lucide-react';
import { deadlineLabel, longDate, plural, shortDate } from '../domain/format';
import { formatPoints } from '../domain/points';
import { configEntries, requirementLabel } from '../domain/requirements';
import {
  challengeBucket,
  challengeTabs,
  participationView,
  submissionView,
  type ChallengeTab,
} from '../domain/status';
import type { ChallengeDetail, ChallengeView, Requirement } from '../services/challenges';
import { ChallengeCard } from './challenge-card';
import { JoinChallengeForm, SubmitContentForm } from './core-forms';
import { Card } from './ui/card';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import { Tabs } from './ui/tabs';
import styles from '../styles/app.module.css';

const EMPTY: Record<ChallengeTab, { title: string; text: string; action?: string }> = {
  available: {
    title: 'Nenhum desafio aberto agora.',
    text: 'Assim que a equipe NUY publicar um novo desafio, ele aparece aqui com prazo, requisitos e Pontos NUY.',
  },
  joined: {
    title: 'Você ainda não está participando de um desafio.',
    text: 'Explore os desafios disponíveis e escolha o primeiro para criar e compartilhar.',
    action: 'Ver disponíveis',
  },
  in_review: {
    title: 'Nenhum envio em análise.',
    text: 'Quando você enviar um conteúdo, o acompanhamento da avaliação aparece aqui.',
  },
  done: {
    title: 'Nenhum desafio concluído ainda.',
    text: 'Os desafios aprovados ficam registrados nesta aba com os pontos conquistados.',
  },
};

/**
 * Lista de desafios com as abas vindas da participação real. As contagens são
 * do que foi lido agora — sem número inventado quando a leitura falha.
 */
export function ChallengesScreen({
  view,
  tab,
  now,
}: {
  view: ChallengeView[] | null;
  tab: ChallengeTab;
  now: Date;
}) {
  const counts = view
    ? challengeTabs.map((entry) => ({
        ...entry,
        count: view.filter((challenge) => challenge.bucket === entry.id).length,
      }))
    : challengeTabs;

  const items = view?.filter((challenge) => challenge.bucket === tab) ?? [];
  const tabLabel = challengeTabs.find((entry) => entry.id === tab)?.label ?? '';

  return (
    <>
      <ScreenHeader
        kicker="Desafios"
        title="Desafios da comunidade"
        intro="Participe, publique seu conteúdo e conquiste Pontos NUY junto com outras creators."
      />

      <Tabs
        items={counts}
        current={tab}
        href={(id) => `/app/desafios?aba=${id}`}
        label="Filtrar desafios"
      />

      <Block>
        {view === null ? (
          <UnavailableState what="os desafios" />
        ) : items.length > 0 ? (
          <div className={styles.challengeGrid}>
            {items.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} now={now} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={tab === 'done' ? <Inbox size={18} /> : <Compass size={18} />}
            title={EMPTY[tab].title}
            text={EMPTY[tab].text}
            action={
              EMPTY[tab].action ? (
                <Link
                  href="/app/desafios?aba=available"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  {EMPTY[tab].action}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
        )}
      </Block>

      {view && view.length > 0 && items.length > 0 ? (
        <p className={styles.footNote}>
          Mostrando {plural(items.length, 'desafio', 'desafios')} em “{tabLabel}”.
        </p>
      ) : null}
    </>
  );
}

function RequirementItem({ requirement }: { requirement: Requirement }) {
  const entries = configEntries(requirement.config);
  const simple = entries.length === 1 && entries[0].key === 'value';
  return (
    <li className={styles.requirementItem}>
      <div className={styles.requirementMain}>
        <p className={styles.requirementLabel}>{requirementLabel(requirement.type)}</p>
        {entries.length > 0 ? (
          <p className={styles.requirementValue}>
            {simple ? entries[0].value : entries.map((e) => `${e.key}: ${e.value}`).join(' · ')}
          </p>
        ) : null}
      </div>
      <span
        className={`${styles.pill} ${requirement.required ? styles.toneProgress : styles.toneMuted}`}
      >
        {requirement.required ? 'Obrigatório' : 'Opcional'}
      </span>
    </li>
  );
}

/** Painel do envio: mostra o que existe e o que o backend ainda não aceita. */
function SubmissionPanel({
  challenge,
  participationEnabled,
  returnTo,
}: {
  challenge: ChallengeView;
  participationEnabled: boolean;
  returnTo: string;
}) {
  const submission = challenge.submission;
  return (
    <Card>
      <h2 className={styles.blockTitle}>Seu envio</h2>
      {submission ? (
        <>
          <div className={styles.panelHead}>
            <Pill view={submissionView(submission.status)} />
            <span className={styles.statHint}>
              Enviado em {shortDate(submission.submittedAt)}
              {submission.revision > 1 ? ` · revisão ${submission.revision}` : ''}
            </span>
          </div>
          {submission.url ? (
            <p className={styles.statHint}>
              <a
                href={submission.url}
                className={styles.blockLink}
                target="_blank"
                rel="noreferrer noopener"
              >
                Abrir publicação
              </a>
            </p>
          ) : null}
          <p className={styles.noteText}>
            O status vem da moderação da equipe NUY; o motivo da análise não é exibido aqui.
          </p>
        </>
      ) : (
        <p className={styles.noteText}>
          {participationEnabled
            ? 'Você ainda não enviou conteúdo para este desafio.'
            : 'O envio de conteúdo pela plataforma será liberado quando a integração com as redes estiver ativa. Enquanto isso, os envios não são registrados por aqui.'}
        </p>
      )}
      {/* Envio real: com a operação configurada, para quem já entrou e sem nada
          em análise. Reenvio aparece quando a equipe pediu revisão — o servidor
          confere participação, prazo e o ciclo inteiro de novo antes de gravar. */}
      {participationEnabled &&
      challenge.participation &&
      (!submission || submission.status === 'revision_requested') ? (
        <SubmitContentForm challengeId={challenge.id} returnTo={returnTo} />
      ) : null}
      <Link href="/app/conteudos" className={styles.blockLink}>
        Ver meus conteúdos
      </Link>
    </Card>
  );
}

/**
 * Detalhe do desafio: briefing, requisitos, prazo, pontuação e regras — só os
 * campos que existem na coleção. Requisito, regra ou integração que não está
 * cadastrada não é inventada para preencher a página.
 */
export function ChallengeDetailScreen({
  detail,
  slug,
  now,
  participationEnabled,
}: {
  detail: ChallengeDetail;
  slug: string;
  now: Date;
  participationEnabled: boolean;
}) {
  const challenge = detail.challenge.state === 'ok' ? (detail.challenge.items[0] ?? null) : null;
  if (detail.challenge.state === 'unavailable')
    return (
      <>
        <BackLink />
        <UnavailableState what="este desafio" />
      </>
    );
  if (!challenge)
    return (
      <>
        <BackLink />
        <EmptyState
          icon={<Search size={18} />}
          title="Desafio não encontrado."
          text={`Não existe desafio publicado com o endereço “${slug}”.`}
          action={
            <Link href="/app/desafios" className={`${styles.button} ${styles.buttonPrimary}`}>
              Ver desafios
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
      </>
    );

  const deadline = deadlineLabel(challenge.endsAt, now);
  const bucket = challengeBucket(challenge);
  const pill = challenge.submission
    ? submissionView(challenge.submission.status)
    : challenge.participation
      ? participationView(challenge.participation.status)
      : null;
  const rules = [
    challenge.platform ? ['Plataforma', challenge.platform] : null,
    challenge.hashtags ? ['Hashtags', challenge.hashtags] : null,
    challenge.mentions ? ['Menções', challenge.mentions] : null,
  ].filter((entry): entry is string[] => entry !== null);

  return (
    <>
      <BackLink />
      {/* O estado da participação fica colado ao título: no canto direito do
          cabeçalho ficaria solto, longe do nome que ele qualifica. */}
      <div className={styles.detailHead}>
        <p className={styles.kicker}>Desafio</p>
        <div className={styles.detailTitleRow}>
          <h1>{challenge.name}</h1>
          {pill ? <Pill view={pill} /> : null}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <Block title="Briefing">
            <Card>
              {challenge.description ? (
                <p>{challenge.description}</p>
              ) : (
                <p className={styles.noteText}>
                  O briefing detalhado deste desafio ainda não foi publicado.
                </p>
              )}
              {challenge.status === 'published' ? null : (
                <p className={styles.statHint}>Situação no catálogo: {challenge.status}.</p>
              )}
            </Card>
          </Block>

          {detail.requirements.state === 'unavailable' ? (
            <Block title="Requisitos">
              <UnavailableState what="os requisitos deste desafio" />
            </Block>
          ) : detail.requirements.items.length > 0 ? (
            <Block title="Requisitos">
              <ul className={styles.requirementList}>
                {detail.requirements.items.map((requirement) => (
                  <RequirementItem key={requirement.id} requirement={requirement} />
                ))}
              </ul>
            </Block>
          ) : null}

          {rules.length > 0 ? (
            <Block title="Regras do desafio">
              <Card>
                <dl className={styles.metaGrid}>
                  {rules.map(([label, value]) => (
                    <div key={label} className={styles.metaPair}>
                      <dt className={styles.metaLabel}>{label}</dt>
                      <dd className={styles.metaValue}>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.statHint}>
                  O conteúdo precisa seguir estas regras para ser aprovado pela equipe NUY.
                </p>
              </Card>
            </Block>
          ) : null}
        </div>

        <aside className={styles.detailAside}>
          <Card tone="navy">
            <p className={styles.statLabel}>Pontos NUY</p>
            <p className={styles.statValueInline}>
              <Coins size={20} aria-hidden="true" />
              {formatPoints(challenge.points)}
            </p>
            <p className={styles.statHint}>
              Aprovado, o envio credita os pontos no seu saldo disponível e na sua jornada.
            </p>
          </Card>

          <Card>
            <p className={styles.statLabel}>Prazo</p>
            <p className={styles.metaValue}>
              <CalendarClock size={15} aria-hidden="true" /> {deadline ?? 'Sem prazo definido'}
            </p>
            {challenge.startsAt ? (
              <p className={styles.statHint}>Aberto desde {longDate(challenge.startsAt)}.</p>
            ) : null}
            {challenge.participantLimit !== null ? (
              <p className={styles.statHint}>
                {challenge.participantCount} de {challenge.participantLimit} vagas ocupadas.
              </p>
            ) : challenge.participantCount > 0 ? (
              <p className={styles.statHint}>
                {plural(
                  challenge.participantCount,
                  'creator já participou',
                  'creators já participaram',
                )}
                .
              </p>
            ) : null}
          </Card>

          {bucket === 'available' && !participationEnabled ? (
            <Card>
              <h2 className={styles.blockTitle}>Como participar</h2>
              <p className={styles.noteText}>
                A entrada em desafios pela plataforma será liberada quando a integração com as redes
                estiver ativa. Os desafios publicados e seus prazos já estão valendo.
              </p>
            </Card>
          ) : null}

          {/* Entrada real no desafio: uma escrita transacional no servidor, com
              limite de vagas conferido no commit — nunca no cliente. */}
          {bucket === 'available' && participationEnabled && !challenge.participation ? (
            <Card>
              <h2 className={styles.blockTitle}>Como participar</h2>
              <p className={styles.noteText}>
                Ao entrar, você assume os requisitos deste desafio e passa a poder enviar conteúdo
                dentro do prazo.
              </p>
              <JoinChallengeForm challengeId={challenge.id} returnTo={`/app/desafios/${slug}`} />
            </Card>
          ) : null}

          <SubmissionPanel
            challenge={challenge}
            participationEnabled={participationEnabled}
            returnTo={`/app/desafios/${slug}`}
          />
        </aside>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/app/desafios" className={styles.backLink}>
      <ArrowLeft size={15} aria-hidden="true" />
      Desafios
    </Link>
  );
}
