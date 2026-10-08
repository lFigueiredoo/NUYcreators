import Link from 'next/link';
import { ArrowRight, Coins, Compass, Sparkles, Trophy } from 'lucide-react';
import { shortDate } from '../domain/format';
import { formatPoints, transactionSign } from '../domain/points';
import type { JourneyView } from '../services/journey';
import type { ChallengeView } from '../services/challenges';
import type { Loaded } from '../services/read';
import type { RankingView } from '../services/ranking';
import { redemptionEnabled, type CatalogView } from '../services/rewards';
import { ChallengeCard, ChallengeThumb } from './challenge-card';
import { RewardCard } from './reward-card';
import { Card } from './ui/card';
import { Pill } from './ui/pill';
import { Progress } from './ui/progress';
import { Block } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import { submissionView } from '../domain/status';
import styles from '../styles/app.module.css';

/** Saudação real: sem nome conhecido, não inventamos um. */
export function DashboardHero({ firstName }: { firstName: string }) {
  return (
    <div className={styles.hero}>
      <h1 className={styles.heroTitle}>{firstName ? `Olá, ${firstName}.` : 'Olá.'}</h1>
      <p className={styles.heroText}>Veja o que está acontecendo na sua jornada NUY Creators.</p>
    </div>
  );
}

function LevelCard({ journey }: { journey: JourneyView }) {
  const progress = journey.progress;
  const total = journey.summary.qualifyingPoints;
  return (
    <Card tone="navy">
      <div className={styles.levelHead}>
        <span className={styles.levelTag}>Seu nível</span>
        <h2 className={styles.levelName}>{progress?.current.name ?? 'Sua jornada'}</h2>
        <p className={styles.levelPoints}>{formatPoints(total)} pontos de jornada</p>
      </div>
      {progress ? (
        <>
          <Progress
            value={progress.ratio * 100}
            max={100}
            label={
              progress.next
                ? `${progress.percent}% do caminho para ${progress.next.name}`
                : 'Nível mais alto da jornada NUY'
            }
          />
          <p className={styles.progressMeta}>
            {progress.next && progress.remaining !== null ? (
              <>
                <span>Faltam {formatPoints(progress.remaining)} pontos</span>
                <span>{progress.next.name}</span>
              </>
            ) : (
              <span>Você está no nível mais alto da jornada.</span>
            )}
          </p>
        </>
      ) : (
        <p className={styles.progressMeta}>
          <span>Os níveis são configurados pela comunidade NUY.</span>
        </p>
      )}
    </Card>
  );
}

function SummaryStats({ journey, ranking }: { journey: JourneyView; ranking: RankingView }) {
  return (
    <>
      <Card>
        <p className={styles.statLabel}>Pontos disponíveis</p>
        <p className={styles.statValue}>{formatPoints(journey.summary.availableBalance)}</p>
        <p className={styles.statHint}>Para usar em recompensas.</p>
      </Card>
      <Card>
        <p className={styles.statLabel}>Pontos de jornada</p>
        <p className={styles.statValue}>{formatPoints(journey.summary.qualifyingPoints)}</p>
        <p className={styles.statHint}>Definem seu nível e não diminuem.</p>
      </Card>
      <Card>
        <p className={styles.statLabel}>No ranking</p>
        {ranking.own?.position ? (
          <>
            <p className={styles.statValue}>{ranking.own.position}º</p>
            <p className={styles.statHint}>
              {formatPoints(ranking.own.earnedPoints)} pontos em {ranking.periodLabel}.
            </p>
          </>
        ) : (
          <>
            <p className={styles.statValue}>—</p>
            <p className={styles.statHint}>
              {ranking.entries.state === 'unavailable'
                ? 'Ranking indisponível agora.'
                : `Sem pontos no ciclo de ${ranking.periodLabel}.`}
            </p>
          </>
        )}
      </Card>
    </>
  );
}

function QuickLinks() {
  const links = [
    ['Desafios', '/app/desafios'],
    ['Meus conteúdos', '/app/conteudos'],
    ['Pontos', '/app/pontos'],
    ['Recompensas', '/app/recompensas'],
    ['Ranking', '/app/ranking'],
  ] as const;
  return (
    <nav className={styles.quickLinks} aria-label="Atalhos">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className={styles.quickLink}>
          {label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}

export function DashboardSkeleton() {
  return (
    <div className={`${styles.grid} ${styles.gridSummary}`} aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
      ))}
    </div>
  );
}

export function DashboardData({
  journey,
  challenges,
  ranking,
  catalog,
  now,
}: {
  journey: JourneyView;
  challenges: Loaded<ChallengeView>;
  ranking: RankingView;
  catalog: CatalogView;
  now: Date;
}) {
  const hasJourney = journey.summary.hasAccount;
  const available =
    challenges.state === 'ok' ? challenges.items.filter((c) => c.bucket === 'available') : [];
  const ongoing =
    challenges.state === 'ok'
      ? challenges.items.filter((c) => c.bucket === 'joined' || c.bucket === 'in_review')
      : [];
  const rewards = catalog.rewards.state === 'ok' ? catalog.rewards.items.slice(0, 3) : [];
  const transactions =
    journey.transactions.state === 'ok' ? journey.transactions.items.slice(0, 5) : [];

  return (
    <>
      {journey.accountState === 'unavailable' ? (
        <UnavailableState what="sua jornada de pontos" />
      ) : hasJourney ? (
        <div className={`${styles.grid} ${styles.gridSummary}`}>
          <LevelCard journey={journey} />
          <SummaryStats journey={journey} ranking={ranking} />
        </div>
      ) : (
        <EmptyState
          icon={<Compass size={18} />}
          title="Sua jornada começa aqui."
          text="Participe dos desafios da comunidade para criar, compartilhar e evoluir."
          action={
            <Link href="/app/desafios" className={`${styles.button} ${styles.buttonPrimary}`}>
              Explorar desafios
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
      )}

      {!hasJourney ? <QuickLinks /> : null}

      <Block
        title="Desafios para você"
        link={
          <Link href="/app/desafios" className={styles.blockLink}>
            Ver todos
          </Link>
        }
      >
        {challenges.state === 'unavailable' ? (
          <UnavailableState what="os desafios" />
        ) : available.length > 0 ? (
          <div className={styles.challengeGrid}>
            {available.slice(0, 3).map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} now={now} />
            ))}
          </div>
        ) : (
          <Card>
            <h3 className={styles.titleRow}>
              <Sparkles size={16} aria-hidden="true" />
              Novos desafios estão a caminho.
            </h3>
            <p>
              Quando a equipe NUY publicar um desafio, ele aparece aqui com prazo, requisitos e
              Pontos NUY.
            </p>
            <Link href="/app/desafios" className={styles.blockLink}>
              Acompanhar desafios
            </Link>
          </Card>
        )}
      </Block>

      {ongoing.length > 0 ? (
        <Block
          title="Continuar participando"
          link={
            <Link href="/app/conteudos" className={styles.blockLink}>
              Meus conteúdos
            </Link>
          }
        >
          <ul className={styles.list}>
            {ongoing.slice(0, 3).map((challenge) => (
              <li key={challenge.id} className={styles.item}>
                <ChallengeThumb name={challenge.name} />
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <h3 className={styles.itemTitle}>
                      <Link href={`/app/desafios/${challenge.slug}`}>{challenge.name}</Link>
                    </h3>
                    {challenge.submission ? (
                      <Pill view={submissionView(challenge.submission.status)} />
                    ) : null}
                  </div>
                  <p className={styles.itemText}>
                    {challenge.submission
                      ? 'Seu envio está registrado. Acompanhe por aqui.'
                      : 'Você está participando. Envie seu conteúdo pelo desafio.'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <div className={styles.split}>
        <Block
          title="Últimas atividades"
          link={
            <Link href="/app/pontos" className={styles.blockLink}>
              Ver extrato
            </Link>
          }
        >
          {journey.transactions.state === 'unavailable' ? (
            <UnavailableState what="suas atividades" />
          ) : transactions.length > 0 ? (
            <ul className={styles.ledger}>
              {transactions.map((transaction) => {
                const sign = transactionSign(transaction.amount);
                return (
                  <li key={transaction.id} className={styles.ledgerItem}>
                    <div className={styles.ledgerMain}>
                      <h3 className={styles.itemTitle}>
                        {transaction.description || 'Movimentação de pontos'}
                      </h3>
                      <span className={styles.ledgerDate}>{shortDate(transaction.createdAt)}</span>
                    </div>
                    <span
                      className={`${styles.amount} ${
                        sign === 'credit'
                          ? styles.amountCredit
                          : sign === 'debit'
                            ? styles.amountDebit
                            : ''
                      }`}
                    >
                      {sign === 'credit' ? '+' : sign === 'debit' ? '−' : ''}
                      {formatPoints(Math.abs(transaction.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Card>
              <h3 className={styles.titleRow}>
                <Coins size={16} aria-hidden="true" />
                Sua história de pontos começa quando você participa.
              </h3>
              <p>Cada aprovação registra os pontos aqui, com data e origem.</p>
            </Card>
          )}
        </Block>

        <Block title="Sua jornada">
          <Card>
            {journey.progress ? (
              <>
                <h3>{journey.progress.current.name}</h3>
                <p>
                  {journey.progress.next && journey.progress.remaining !== null
                    ? `Faltam ${formatPoints(journey.progress.remaining)} pontos para ${journey.progress.next.name}.`
                    : 'Você está no nível mais alto da jornada NUY.'}
                </p>
                <Progress
                  value={journey.progress.ratio * 100}
                  max={100}
                  label={
                    journey.progress.next
                      ? `${journey.progress.percent}% do caminho para ${journey.progress.next.name}`
                      : 'Nível mais alto da jornada NUY'
                  }
                />
                <p className={styles.statHint}>
                  Seu nível vem dos pontos de jornada — resgatar recompensa usa os pontos
                  disponíveis e não diminui o nível.
                </p>
              </>
            ) : (
              <>
                <h3>Seu nível aparece aqui.</h3>
                <p>
                  {hasJourney
                    ? 'Ainda não há configuração de níveis disponível para calcular o progresso.'
                    : 'Os níveis são calculados a partir dos seus pontos de jornada.'}
                </p>
              </>
            )}
          </Card>
        </Block>
      </div>

      <Block
        title="Recompensas em destaque"
        link={
          <Link href="/app/recompensas" className={styles.blockLink}>
            Ver catálogo
          </Link>
        }
      >
        {catalog.rewards.state === 'unavailable' ? (
          <UnavailableState what="o catálogo de recompensas" />
        ) : rewards.length > 0 ? (
          <>
            <p className={styles.statHint}>
              {hasJourney
                ? `Seu saldo: ${formatPoints(catalog.balance)} pontos disponíveis.`
                : 'Participe de um desafio para acumular pontos e trocar por recompensas.'}
            </p>
            <div className={styles.challengeGrid}>
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  redemptionEnabled={redemptionEnabled()}
                  returnTo="/app"
                />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <h3 className={styles.titleRow}>
              <Trophy size={16} aria-hidden="true" />
              Novas experiências estão sendo preparadas.
            </h3>
            <p>O catálogo aparece aqui assim que a equipe NUY publicar as primeiras recompensas.</p>
          </Card>
        )}
      </Block>
    </>
  );
}
