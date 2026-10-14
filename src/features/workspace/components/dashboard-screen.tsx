import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Coins, Gift, PenLine, Sparkles, Trophy } from 'lucide-react';
import { longDate, notStarted, plural, shortDate } from '../domain/format';
import { formatPoints, transactionSign } from '../domain/points';
import type { JourneyView } from '../services/journey';
import { participationEnabled, type ChallengeView } from '../services/challenges';
import type { Loaded } from '../services/read';
import type { RankingView } from '../services/ranking';
import { redemptionEnabled, type CatalogView } from '../services/rewards';
import { ChallengeCard, ChallengeRow } from './challenge-card';
import { RewardCard, RewardRow } from './reward-card';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Block } from './ui/screen';
import { UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Saudação real: sem nome conhecido, não inventamos um.
 *
 * O aceno é irmão do `h1`, nunca parte dele: o título é dado ("Olá, Ana.") e o
 * emoji é enfeite — some da leitura por leitor de tela e não entra no texto.
 */
export function DashboardHero({ firstName }: { firstName: string }) {
  return (
    <div className={styles.hero}>
      <div className={styles.heroRow}>
        <h1 className={styles.heroTitle}>{firstName ? `Olá, ${firstName}.` : 'Olá.'}</h1>
        <span className={styles.heroWave} aria-hidden="true">
          👋
        </span>
      </div>
      <p className={styles.heroText}>Veja o que está acontecendo na sua jornada NUY Creators.</p>
    </div>
  );
}

/**
 * O que a faixa convida a fazer agora — decidido pelos dados lidos, nunca por
 * suposição sobre a creator.
 *
 * Com desafio aberto, o convite é entrar nele. Sem desafio aberto mas com algo
 * já começado, o convite é continuar: quem tem quatro desafios nas costas não
 * precisa que a tela lhe apresente a comunidade de novo. Sem nada em aberto e
 * sem nada começado, sobra a lista de desafios. E quando a leitura falha, a
 * faixa diz que falhou — não inventa "nenhum desafio aberto".
 */
type BannerFocus =
  | { kind: 'available'; name: string; href: string; points: number; startsAt: string }
  | { kind: 'ongoing'; name: string; href: string }
  | { kind: 'none' }
  | { kind: 'unavailable' };

/** Rótulo, destino e a linha que explica o convite — uma redação só, três telas. */
function focusAction(focus: BannerFocus, now: Date): { href: string; label: string; lead: string } {
  switch (focus.kind) {
    case 'available':
      // Desafio publicado cuja janela ainda não abriu: a faixa diz a data e não
      // convida a entrar — a entrada só existe quando o servidor aceita, e ele
      // recusa (`window_closed`) enquanto `startsAt` está no futuro.
      if (notStarted(focus.startsAt, now))
        return {
          href: focus.href,
          label: 'Conhecer o desafio',
          lead: `Em breve: ${focus.name} começa em ${longDate(focus.startsAt)} — ${formatPoints(focus.points)} Pontos NUY quando o conteúdo for aprovado.`,
        };
      return {
        href: focus.href,
        // O botão não promete o que o servidor não faz: sem a operação de entrada
        // ligada, ele convida a conhecer o desafio, não a "participar" de algo que
        // não gravou nada.
        label: participationEnabled() ? 'Participar do desafio' : 'Conhecer o desafio',
        lead: `${focus.name} está aberto — ${formatPoints(focus.points)} Pontos NUY quando o conteúdo for aprovado.`,
      };
    case 'ongoing':
      return {
        href: focus.href,
        label: 'Continuar participando',
        lead: `Você está em ${focus.name}. Continue de onde parou.`,
      };
    case 'unavailable':
      return {
        href: '/app/desafios',
        label: 'Ver desafios da comunidade',
        lead: 'Não foi possível ler os desafios agora. A lista continua no mesmo lugar de sempre.',
      };
    default:
      return {
        href: '/app/desafios',
        label: 'Ver desafios da comunidade',
        lead: 'Nenhum desafio aberto agora. Quando a equipe NUY publicar um novo, ele aparece aqui.',
      };
  }
}

/**
 * A casca da faixa navy: o packshot real de um lado, o que a creator faz agora
 * do outro.
 *
 * A foto é do acervo da marca (`public/brand/nuy-creators-v2/products`), uma
 * composição fornecida pela própria NUY — nada foi desenhado nem recriado aqui — e
 * entra recortada pela coluna, sem moldura sobre o navy. A
 * casca é uma só para as duas versões da faixa (com jornada e sem): a foto e o
 * CTA não podem divergir entre quem acabou de se cadastrar e quem já pontuou.
 */
function BannerShell({
  cta,
  children,
}: {
  cta: { href: string; label: string; lead: string };
  children: ReactNode;
}) {
  return (
    <Card tone="navy" className={`${styles.banner} ${styles.enter}`}>
      <div className={styles.bannerBody}>
        {children}
        {/* O próximo passo mora na faixa, não num cartão à parte: é a primeira
            coisa que a creator vê, e é ela que muda conforme o que existe. */}
        <div className={styles.bannerCta}>
          <p className={styles.bannerLead}>{cta.lead}</p>
          <Link href={cta.href} className={`${styles.button} ${styles.buttonNavy}`}>
            {cta.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className={styles.bannerMedia}>
        {/* Composição fornecida pela NUY em 8/10/2026 — sabonete, aromatizador e
            limpador, os três da linha Herbal Selvagem. O arquivo entrou no acervo
            byte a byte como veio (mesmo SHA-256), sem recodificação: a sobra de
            proporção é resolvida pelo `object-fit` da caixa, não pelo arquivo. */}
        {/* A faixa é o LCP do painel (medido: `lcp.element` aponta para esta
            imagem). O Next 16 depreciou `priority` em favor de `preload`, mas
            recomenda `loading="eager"` + `fetchPriority="high"` quando o
            `loading` já é usado — é o caso aqui, e é o que tira a imagem do
            lazy sem abrir mão das outras props. */}
        <Image
          src="/brand/nuy-creators-v2/products/products-herbal-selvagem.png"
          alt=""
          width={1672}
          height={941}
          sizes="(max-width: 900px) 100vw, 540px"
          loading="eager"
          fetchPriority="high"
          className={styles.bannerImg}
        />
      </div>
    </Card>
  );
}

/**
 * A faixa do nível: jornada e progresso à esquerda, o próximo passo abaixo.
 *
 * Os números são os mesmos da tela de Pontos: `qualifyingPoints` define o nível e
 * o cálculo do progresso é o de `domain/levels`.
 */
function LevelBanner({
  journey,
  focus,
  now,
}: {
  journey: JourneyView;
  focus: BannerFocus;
  now: Date;
}) {
  const progress = journey.progress;
  const total = journey.summary.qualifyingPoints;
  return (
    <BannerShell cta={focusAction(focus, now)}>
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
    </BannerShell>
  );
}

/**
 * A faixa de quem ainda não tem jornada — o primeiro acesso.
 *
 * Sem conta de pontos não existe nível, progresso nem saldo, e nenhum deles pode
 * ser inventado para preencher a faixa: um "0" aqui diria que a creator tem zero
 * pontos, quando o que ela tem é uma jornada que não começou. Então a faixa troca
 * os números pela frase que diz como eles nascem, e mantém tudo o mais — a mesma
 * foto do acervo, o mesmo CTA, o mesmo lugar na tela.
 *
 * Antes disto o primeiro acesso abria com uma caixa clara, de ícone e duas linhas,
 * no lugar onde a creator com jornada vê a faixa navy. Numa tela que promete
 * mostrar o que está acontecendo, aquele retângulo vazio se lê como área que não
 * carregou — e é a primeira coisa que ela vê.
 */
function StartBanner({ focus, now }: { focus: BannerFocus; now: Date }) {
  const contexto = focusAction(focus, now);
  return (
    // O convite leva à lista, e não a um desafio específico: quem chega agora ainda
    // não sabe o que é um desafio da NUY, e a lista é onde isso se lê de uma vez. A
    // linha acima dele é que diz o que está aberto — inclusive quando o que está
    // publicado abre só mais adiante.
    <BannerShell cta={{ href: '/app/desafios', label: 'Explorar desafios', lead: contexto.lead }}>
      <div className={styles.levelHead}>
        <span className={styles.levelTag}>Primeiros passos</span>
        <h2 className={styles.levelName}>Sua jornada começa aqui.</h2>
        <p className={styles.levelPoints}>
          Ainda sem Pontos NUY — eles entram com o primeiro aprovado.
        </p>
      </div>
      {/* Onde quem já pontua vê a barra de progresso, quem não pontua lê de onde os
          pontos vêm. Uma barra em 0% seria a mesma informação falsa do "zero". */}
      <p className={styles.progressMeta}>
        <span>Seus pontos de jornada definem seu nível e não diminuem.</span>
      </p>
    </BannerShell>
  );
}

function SummaryStats({ journey, ranking }: { journey: JourneyView; ranking: RankingView }) {
  return (
    <>
      <Card className={`${styles.enter} ${styles.i1}`}>
        <p className={styles.statLabel}>Pontos disponíveis</p>
        <p className={styles.statValue}>{formatPoints(journey.summary.availableBalance)}</p>
        <p className={styles.statHint}>Para usar em recompensas.</p>
      </Card>
      <Card className={`${styles.enter} ${styles.i2}`}>
        <p className={styles.statLabel}>Pontos de jornada</p>
        <p className={styles.statValue}>{formatPoints(journey.summary.qualifyingPoints)}</p>
        <p className={styles.statHint}>Definem seu nível e não diminuem.</p>
      </Card>
      <Card className={`${styles.enter} ${styles.i3}`}>
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
    <nav className={`${styles.quickLinks} ${styles.enter} ${styles.i1}`} aria-label="Atalhos">
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
    <div className={styles.stack} aria-hidden="true">
      <div className={`${styles.skeleton} ${styles.skeletonBanner}`} />
      <div className={`${styles.grid} ${styles.gridSummary}`}>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>
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
  const items = challenges.state === 'ok' ? challenges.items : [];
  const available = items.filter((challenge) => challenge.bucket === 'available');
  const ongoing = items.filter(
    (challenge) => challenge.bucket === 'joined' || challenge.bucket === 'in_review',
  );
  const done = items.filter((challenge) => challenge.bucket === 'done');
  const rewards = catalog.rewards.state === 'ok' ? catalog.rewards.items.slice(0, 3) : [];
  const transactions =
    journey.transactions.state === 'ok' ? journey.transactions.items.slice(0, 5) : [];
  const featured = available.slice(0, 4);
  // O ranking é da comunidade, não um widget de posição: as mesmas três pessoas
  // que abrem o pódio da tela de ranking aparecem aqui para dar contexto ao
  // número. Nomes vêm da projeção pública — a que a própria creator autorizou.
  const leaders = ranking.entries.state === 'ok' ? ranking.entries.items.slice(0, 3) : [];

  // Próximo passo da faixa: o desafio aberto, senão o que ela já começou.
  //
  // Entre os abertos, a faixa convida para o que dá para fazer AGORA: um publicado
  // cuja janela ainda não abriu é recusado pelo servidor (`core/join`), então ele
  // só ocupa a faixa quando não houver nenhum já em andamento — e aí a linha dele
  // diz a data, não o convite. Sem jornada também vale: o que existe publicado é
  // assunto de todo mundo, tenha ela pontos ou não.
  const openNow =
    available.find((challenge) => !notStarted(challenge.startsAt, now)) ?? available[0];
  const focus: BannerFocus = openNow
    ? {
        kind: 'available',
        name: openNow.name,
        href: `/app/desafios/${openNow.slug}`,
        points: openNow.points,
        startsAt: openNow.startsAt,
      }
    : ongoing[0]
      ? { kind: 'ongoing', name: ongoing[0].name, href: `/app/desafios/${ongoing[0].slug}` }
      : challenges.state === 'unavailable'
        ? { kind: 'unavailable' }
        : { kind: 'none' };

  // A atividade principal ganha a forma de destaque: o primeiro desafio em
  // andamento vira cartão deitado com a capa real ao lado do texto; o resto
  // continua em linha.
  const [lead, ...others] = ongoing.slice(0, 4);
  const history = ongoing.length + done.length;

  return (
    <>
      {journey.accountState === 'unavailable' ? (
        <UnavailableState what="sua jornada de pontos" />
      ) : hasJourney ? (
        <div className={styles.stack}>
          <LevelBanner journey={journey} focus={focus} now={now} />
          <div className={`${styles.grid} ${styles.gridSummary}`}>
            <SummaryStats journey={journey} ranking={ranking} />
          </div>
        </div>
      ) : (
        // Sem conta de pontos não há indicadores a mostrar: "0 pontos disponíveis"
        // e "0 de jornada" seriam números verdadeiros dizendo a coisa errada — que
        // ela tem zero, e não que a jornada ainda não começou. Os três cartões só
        // existem para quem tem o que eles medem.
        <StartBanner focus={focus} now={now} />
      )}

      {!hasJourney ? <QuickLinks /> : null}

      <Block
        title="Desafios em destaque"
        className={`${styles.enter} ${styles.i4}`}
        link={
          <Link href="/app/desafios" className={styles.blockLink}>
            Ver todos
          </Link>
        }
      >
        {challenges.state === 'unavailable' ? (
          <UnavailableState what="os desafios" />
        ) : featured.length > 0 ? (
          <div className={styles.gridFeature}>
            {featured.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} now={now} feature />
            ))}
          </div>
        ) : (
          // Sem desafio em destaque, o vazio sabe o que ela já viveu: dizer
          // "novos desafios estão a caminho" para quem tem quatro no histórico
          // soa como se a tela não soubesse dela.
          <Card>
            <h3 className={styles.titleRow}>
              <Sparkles size={16} aria-hidden="true" />
              {history > 0
                ? 'Os desafios abertos já estão na sua jornada.'
                : 'Novos desafios estão a caminho.'}
            </h3>
            <p>
              {history > 0
                ? `Você tem ${plural(ongoing.length, 'desafio em andamento', 'desafios em andamento')} e ${plural(done.length, 'concluído', 'concluídos')}. Quando a equipe NUY publicar um desafio novo, ele aparece aqui com prazo, requisitos e Pontos NUY.`
                : 'Quando a equipe NUY publicar um desafio, ele aparece aqui com prazo, requisitos e Pontos NUY.'}
            </p>
            <Link
              href={history > 0 ? '/app/desafios?aba=joined' : '/app/desafios'}
              className={styles.blockLink}
            >
              {history > 0 ? 'Ver meus desafios em andamento' : 'Acompanhar desafios'}
            </Link>
          </Card>
        )}
      </Block>

      {/*
       * Duas colunas, não três. Três colunas de ~300px partiam títulos, espremiam
       * as miniaturas e davam à página o aspecto de grade de widgets: cada cartão
       * ficava pequeno e nenhum assunto tinha peso. Aqui a esquerda é a creator —
       * o que ela está fazendo e o que já aconteceu com os pontos dela; a direita
       * reúne o que ela pode buscar: recompensas e a comunidade do ranking.
       */}
      <div className={styles.gridEditorial}>
        <div className={`${styles.column} ${styles.enter} ${styles.i5}`}>
          {ongoing.length > 0 ? (
            <Block
              title="Continuar participando"
              link={
                <Link href="/app/conteudos" className={styles.blockLink}>
                  Meus conteúdos
                </Link>
              }
            >
              {/* A atividade principal abre a coluna em forma de destaque, com a
                  capa real do desafio: é o que ela está fazendo agora, e é o que
                  a página mostra primeiro. Sem grade em volta — uma grade de duas
                  colunas deixaria o único destaque com metade da largura. */}
              {lead ? <ChallengeCard challenge={lead} now={now} feature /> : null}
              {others.length > 0 ? (
                <ul className={`${styles.list} ${styles.listSpaced}`}>
                  {others.map((challenge) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} now={now} />
                  ))}
                </ul>
              ) : null}
            </Block>
          ) : (
            <Block
              title="Meu conteúdo recente"
              link={
                <Link href="/app/conteudos" className={styles.blockLink}>
                  Meus conteúdos
                </Link>
              }
            >
              <Card>
                <h3 className={styles.titleRow}>
                  <PenLine size={16} aria-hidden="true" />
                  Seus envios aparecem aqui.
                </h3>
                <p>
                  Participe de um desafio e envie seu conteúdo: o que você publica fica reunido em
                  Meus conteúdos.
                </p>
                <Link href="/app/desafios" className={styles.blockLink}>
                  Ver desafios
                </Link>
              </Card>
            </Block>
          )}

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
                        <span className={styles.ledgerDate}>
                          {shortDate(transaction.createdAt)}
                        </span>
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
        </div>

        <div className={`${styles.column} ${styles.enter} ${styles.i5}`}>
          {/* Título curto: nesta coluna o cabeçalho divide a linha com o link, e
              "Recompensas em destaque" quebrava em duas linhas sozinho. */}
          <Block
            title="Recompensas"
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
                <p className={styles.balanceLine}>
                  <Gift size={15} aria-hidden="true" />
                  {hasJourney
                    ? `${formatPoints(catalog.balance)} pontos disponíveis para trocar`
                    : 'Participe de um desafio para acumular pontos'}
                </p>
                {/* Variante de peso: a foto da recompensa em tamanho de vitrine e
                    o custo em número de destaque — é para cá que os pontos vão. */}
                <ul className={`${styles.list} ${styles.listSpaced}`}>
                  {rewards.map((reward) => (
                    <RewardRow
                      key={reward.id}
                      reward={reward}
                      redemptionEnabled={redemptionEnabled()}
                      spotlight
                    />
                  ))}
                </ul>
              </>
            ) : (
              <Card>
                <h3 className={styles.titleRow}>
                  <Trophy size={16} aria-hidden="true" />
                  Novas experiências estão sendo preparadas.
                </h3>
                <p>
                  O catálogo aparece aqui assim que a equipe NUY publicar as primeiras recompensas.
                </p>
              </Card>
            )}
          </Block>

          {/* Ranking como bloco de comunidade: a posição dela e, logo abaixo, quem
              está na frente nesta ciclo. Sem gente inventada — são as mesmas
              linhas da tela de ranking, com o nome público que cada uma autorizou. */}
          <Block
            title="Ranking da comunidade"
            link={
              <Link href="/app/ranking" className={styles.blockLink}>
                Ver ranking
              </Link>
            }
          >
            <Card>
              <div className={styles.rankSelf}>
                <div>
                  <p className={styles.statLabel}>Sua posição</p>
                  {ranking.own?.position ? (
                    <p className={styles.statValue}>{ranking.own.position}º</p>
                  ) : (
                    <p className={styles.statValue}>—</p>
                  )}
                </div>
                <p className={styles.statHint}>
                  {ranking.own?.position
                    ? `${formatPoints(ranking.own.earnedPoints)} pontos ganhos em ${ranking.periodLabel}.`
                    : ranking.entries.state === 'unavailable'
                      ? 'Ranking indisponível agora.'
                      : `Sem pontos no ciclo de ${ranking.periodLabel}.`}
                </p>
              </div>
              {leaders.length > 0 ? (
                <ul className={styles.rankMini}>
                  {leaders.map((entry, index) => (
                    <li
                      key={`${index}-${entry.displayName}`}
                      className={
                        entry.isViewer
                          ? `${styles.rankMiniItem} ${styles.rankMiniSelf}`
                          : styles.rankMiniItem
                      }
                    >
                      <span className={styles.rankPosition}>{entry.position}º</span>
                      <span className={styles.rankName}>{entry.displayName}</span>
                      <span className={styles.rankPoints}>{formatPoints(entry.earnedPoints)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
            {leaders.length > 0 ? (
              <p className={styles.footNote}>
                Quem lidera o ciclo de {ranking.periodLabel}. O nome exibido é o público — só ele
                aparece aqui, nunca e-mail, telefone ou cidade.
              </p>
            ) : null}
          </Block>
        </div>
      </div>
    </>
  );
}
