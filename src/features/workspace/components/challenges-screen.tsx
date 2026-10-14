import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Coins,
  Compass,
  Inbox,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  deadlineLabel,
  longDate,
  notStarted,
  plural,
  shortDate,
  startLabel,
} from '../domain/format';
import { platformLabel } from '../domain/labels';
import { formatPoints } from '../domain/points';
import { configEntries, requirementLabel } from '../domain/requirements';
import {
  COMING_VIEW,
  challengeBucket,
  challengeTabs,
  participationView,
  submissionView,
  type ChallengeTab,
} from '../domain/status';
import type { ChallengeDetail, ChallengeView, Requirement } from '../services/challenges';
import { ChallengeCard } from './challenge-card';
import { JoinChallengeForm, SubmitContentForm } from './core-forms';
import { Card, CardMedia, CoverFallback } from './ui/card';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import { Tabs, type TabItem } from './ui/tabs';
import styles from '../styles/app.module.css';
import { CommunityComments } from '@/features/academy/components/comments';
import type { AcademyComment, AcademyLoad } from '@/features/academy/domain';

type EmptyCopy = { title: string; text: string; action?: { href: string; label: string } };

const EMPTY: Record<ChallengeTab, EmptyCopy> = {
  available: {
    title: 'Nenhum desafio aberto agora.',
    text: 'Assim que a equipe NUY publicar um novo desafio, ele aparece aqui com prazo, requisitos e Pontos NUY.',
  },
  joined: {
    title: 'Você ainda não está participando de um desafio.',
    text: 'Explore os desafios disponíveis e escolha o primeiro para criar e compartilhar.',
    action: { href: '/app/desafios?aba=available', label: 'Ver disponíveis' },
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
 * O vazio de "Disponíveis" sabe o que já existe no histórico.
 *
 * A aba vazia não é a mesma coisa para quem nunca entrou em nada e para quem já
 * está em TODOS os desafios publicados — e, quando ela está vazia, é exatamente
 * este o caso: nenhum desafio visível ficou sem participação. Dizer "assim que a
 * equipe publicar um novo" para quem tem quatro desafios nas costas soa como se
 * a tela não soubesse dela. As contagens são as das próprias abas: nada de
 * número novo, nada de suposição sobre o passado.
 */
function emptyCopy(tab: ChallengeTab, counts: Record<ChallengeTab, number>): EmptyCopy {
  if (tab !== 'available') return EMPTY[tab];
  const history = counts.joined + counts.in_review + counts.done;
  if (history === 0) return EMPTY.available;
  const parts: string[] = [];
  if (counts.joined) parts.push(`${counts.joined} em andamento`);
  if (counts.in_review) parts.push(`${counts.in_review} em análise`);
  if (counts.done) parts.push(`${counts.done} ${plural(counts.done, 'concluído', 'concluídos')}`);
  return {
    title: 'Nenhum desafio aberto agora.',
    text: `Você já participou dos desafios publicados pela comunidade — ${parts.join(' · ')}. Quando a equipe NUY publicar um novo desafio, ele aparece aqui com prazo, requisitos e Pontos NUY.`,
    action: counts.in_review
      ? { href: '/app/desafios?aba=in_review', label: 'Acompanhar o que está em análise' }
      : { href: '/app/desafios?aba=done', label: 'Ver meus desafios' },
  };
}

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
  // Sem leitura (`view === null`) as abas vêm sem contagem e a tela mostra
  // "indisponível" — o vazio com histórico nunca é montado sem número real.
  const counts: TabItem[] = challengeTabs.map((entry) => ({
    id: entry.id,
    label: entry.label,
    count: view ? view.filter((challenge) => challenge.bucket === entry.id).length : undefined,
  }));
  const total = Object.fromEntries(counts.map((entry) => [entry.id, entry.count ?? 0])) as Record<
    ChallengeTab,
    number
  >;

  const items = view?.filter((challenge) => challenge.bucket === tab) ?? [];
  const tabLabel = challengeTabs.find((entry) => entry.id === tab)?.label ?? '';
  const empty = emptyCopy(tab, total);

  return (
    <>
      <ScreenHeader
        kicker="Desafios"
        title="Desafios da comunidade"
        intro="Participe, publique seu conteúdo e conquiste Pontos NUY junto com outras creators."
        className={styles.enter}
      />

      <Tabs
        items={counts}
        current={tab}
        href={(id) => `/app/desafios?aba=${id}`}
        label="Filtrar desafios"
        className={`${styles.enter} ${styles.i1}`}
      />

      <Block className={`${styles.enter} ${styles.i2}`}>
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
            icon={
              tab === 'done' ? (
                <Inbox size={18} />
              ) : tab === 'available' && total.joined + total.in_review + total.done > 0 ? (
                <Sparkles size={18} />
              ) : (
                <Compass size={18} />
              )
            }
            title={empty.title}
            text={empty.text}
            action={
              empty.action ? (
                <Link
                  href={empty.action.href}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  {empty.action.label}
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
  coming,
}: {
  challenge: ChallengeView;
  participationEnabled: boolean;
  returnTo: string;
  /** Janela ainda fechada: quem não está dentro não tem envio a fazer. */
  coming: boolean;
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
          {/* Sem participação e com a janela fechada, "você ainda não enviou" soa
              como uma cobrança por algo que nem é possível fazer: a frase fala do
              que vem, não do que falta. Os dois motivos aparecem quando valem os
              dois — a data em que abre e a integração que ainda não opera. */}
          {!challenge.participation && coming
            ? `A participação abre em ${longDate(challenge.startsAt)}. ${
                participationEnabled
                  ? 'O envio de conteúdo fica disponível a partir daí.'
                  : 'O envio de conteúdo pela plataforma será liberado quando a integração com as redes estiver ativa.'
              }`
            : participationEnabled
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
  comments,
  viewerId,
}: {
  detail: ChallengeDetail;
  slug: string;
  now: Date;
  participationEnabled: boolean;
  comments: AcademyLoad<AcademyComment>;
  viewerId: string;
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
  const coming = notStarted(challenge.startsAt, now);
  const bucket = challengeBucket(challenge);
  const pill = challenge.submission
    ? submissionView(challenge.submission.status)
    : challenge.participation
      ? participationView(challenge.participation.status)
      : coming
        ? COMING_VIEW
        : null;
  const rules = [
    challenge.platform ? ['Plataforma', platformLabel(challenge.platform)] : null,
    challenge.hashtags ? ['Hashtags', challenge.hashtags] : null,
    challenge.mentions ? ['Menções', challenge.mentions] : null,
  ].filter((entry): entry is string[] => entry !== null);

  return (
    <>
      <BackLink />
      {/* O estado da participação fica colado ao título: no canto direito do
          cabeçalho ficaria solto, longe do nome que ele qualifica. */}
      <div className={`${styles.detailHead} ${styles.enter}`}>
        <p className={styles.kicker}>Desafio</p>
        <div className={styles.detailTitleRow}>
          <h1>{challenge.name}</h1>
          {pill ? <Pill view={pill} /> : null}
        </div>
      </div>

      {/* A capa é a MESMA caixa de mídia dos cartões (`CardMedia`): o recorte não
          muda entre a lista e a página. Sem imagem publicada, a caixa grande não
          vira um retângulo com uma letra solta — a capa institucional da marca
          assume o lugar. Com imagem, o renderizador é o de sempre, sem tocar no
          acesso. */}
      <CardMedia
        fileId={challenge.imageFileId}
        name={challenge.name}
        cover={<CoverFallback />}
        className={[styles.detailMedia, challenge.imageFileId ? null : styles.detailMediaEmpty]
          .filter(Boolean)
          .join(' ')}
      />

      <div className={`${styles.detailGrid} ${styles.enter} ${styles.i1}`}>
        <div className={styles.detailMain}>
          <Block title="Sobre o desafio">
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
            <Block title="O que enviar">
              <UnavailableState what="os requisitos deste desafio" />
            </Block>
          ) : detail.requirements.items.length > 0 ? (
            <Block title="O que enviar">
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
              // "Aberto desde 01 de novembro de 2026" numa linha cuja janela ainda
              // não abriu é uma frase falsa — e era ela que acompanhava o botão de
              // entrar que o servidor recusa. Quem ainda não começou diz quando
              // começa.
              <p className={styles.statHint}>
                {coming
                  ? `${startLabel(challenge.startsAt)}.`
                  : `Aberto desde ${longDate(challenge.startsAt)}.`}
              </p>
            ) : null}
            {challenge.participantLimit !== null ? (
              <p className={styles.statHint}>
                {challenge.participantCount} de {challenge.participantLimit} vagas ocupadas.
              </p>
            ) : challenge.participantCount > 0 ? (
              <p className={styles.statHint}>
                {/* "creator já participou" falava da creator na terceira pessoa,
                    como ficha de catálogo. Quem participou é gente. */}
                {plural(
                  challenge.participantCount,
                  'pessoa já participou',
                  'pessoas já participaram',
                )}
                .
              </p>
            ) : null}
          </Card>

          {/* Desafio publicado cuja janela ainda não abriu: o lugar do botão de
              entrar é ocupado pela data em que ele abre. Antes, esta tela oferecia
              a entrada e o servidor devolvia "não está mais no prazo" — recusa por
              um prazo que, para quem lê, ainda nem começou. */}
          {bucket === 'available' && coming ? (
            <Card>
              <h2 className={styles.blockTitle}>Ainda não começou</h2>
              <p className={styles.noteText}>
                A participação abre em {longDate(challenge.startsAt)} — até lá, este desafio fica
                publicado para você ler o briefing e os requisitos com antecedência.
              </p>
              {/* Com a operação de entrada desligada, o motivo de não haver botão
                  aqui é duplo: a data e a integração. Os dois são ditos — e o
                  "prazos já estão valendo" sai de cena, porque o prazo deste
                  desafio começa quando ele começar. */}
              {participationEnabled ? null : (
                <p className={styles.noteText}>
                  A entrada em desafios pela plataforma será liberada quando a integração com as
                  redes estiver ativa. A partir da data acima, este desafio passa a valer como os
                  demais.
                </p>
              )}
            </Card>
          ) : null}

          {bucket === 'available' && !coming && !participationEnabled ? (
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
          {bucket === 'available' && !coming && participationEnabled && !challenge.participation ? (
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
            coming={coming}
          />
        </aside>
      </div>
      <CommunityComments target="desafio" targetId={challenge.id} comments={comments} viewerId={viewerId} />
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
