import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { plural } from '../domain/format';
import { formatPoints } from '../domain/points';
import type { RankingView } from '../services/ranking';
import { Card } from './ui/card';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

function RankingEmpty({ periodLabel }: { periodLabel: string }) {
  return (
    <EmptyState
      icon={<Trophy size={18} />}
      title="O ranking deste ciclo ainda está começando."
      text={`Quando os creators da comunidade pontuarem em ${periodLabel}, a classificação aparece aqui.`}
      action={
        <Link
          href="/app/desafios?aba=available"
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Explorar desafios
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      }
    />
  );
}

/**
 * Ranking do ciclo.
 *
 * A régua é sempre pontos GANHOS no período (`earnedPoints`) — nunca o saldo
 * disponível: quem resgata recompensa não cai de posição. O nome exibido vem
 * apenas da projeção pública sanitizada; e-mail, telefone, cidade e handle
 * declarado não existem nesta tela.
 */
export function RankingScreen({ ranking }: { ranking: RankingView }) {
  const unavailable = ranking.entries.state === 'unavailable';
  const entries = ranking.entries.state === 'ok' ? ranking.entries.items : [];
  const podium = entries.slice(0, 3);
  const classification = entries.slice(3);

  return (
    <>
      <ScreenHeader
        kicker="Ranking"
        title="Ranking da comunidade"
        intro={`Pontos ganhos no ciclo de ${ranking.periodLabel}. Resgatar recompensa usa o seu saldo e não muda a sua posição.`}
      />

      {unavailable ? (
        <UnavailableState what="o ranking" />
      ) : (
        <Card tone="navy">
          <p className={styles.statLabel}>Sua posição</p>
          <p className={styles.statValueInline}>
            <Trophy size={20} aria-hidden="true" />
            {ranking.own?.position ? `${ranking.own.position}º` : '—'}
          </p>
          <p className={styles.statHint}>
            {ranking.own?.position
              ? `${formatPoints(ranking.own.earnedPoints)} pontos ganhos em ${ranking.periodLabel}.`
              : ranking.own
                ? `Você ganhou ${formatPoints(ranking.own.earnedPoints)} pontos neste ciclo; a posição aparece junto com a classificação do período.`
                : `Sem pontos ganhos no ciclo de ${ranking.periodLabel}. Participe de um desafio para entrar no ranking.`}
          </p>
        </Card>
      )}

      {podium.length > 0 ? (
        <Block title="Destaques do ciclo">
          {/* A grade se ajusta a quem existe: três colunas para três pessoas, duas
              para duas, e uma só — sem largura fixa deixando um buraco na terceira
              coluna. Um ciclo com pouca gente não vira uma tela pela metade. */}
          <ol
            className={
              podium.length === 1 ? `${styles.podiumRow} ${styles.podiumSolo}` : styles.podiumRow
            }
          >
            {podium.map((entry, index) => (
              <li
                key={entry.displayName + index}
                className={index === 0 ? `${styles.podium} ${styles.podiumFirst}` : styles.podium}
              >
                <span className={styles.podiumPlace}>{entry.position}º</span>
                <span className={styles.podiumName}>{entry.displayName}</span>
                <span className={styles.podiumPoints}>
                  {formatPoints(entry.earnedPoints)} pontos ganhos
                </span>
                {entry.isViewer ? (
                  <span className={`${styles.pill} ${styles.toneNeutral}`}>Você</span>
                ) : null}
              </li>
            ))}
          </ol>
          {entries.length <= 3 ? (
            <p className={styles.footNote}>
              Neste ciclo, {plural(entries.length, 'pessoa pontuou', 'pessoas pontuaram')} até
              agora. A classificação cresce conforme a comunidade participa.
            </p>
          ) : null}
        </Block>
      ) : null}

      {classification.length > 0 ? (
        <Block title="Classificação">
          <ol className={styles.rankList}>
            {classification.map((entry, index) => (
              <li
                key={entry.displayName + index}
                className={
                  entry.isViewer ? `${styles.rankItem} ${styles.rankItemSelf}` : styles.rankItem
                }
              >
                <span className={styles.rankPosition}>{entry.position}º</span>
                <span className={styles.rankName}>{entry.displayName}</span>
                {entry.isViewer ? (
                  <span className={`${styles.pill} ${styles.toneNeutral}`}>Você</span>
                ) : null}
                <span className={styles.rankPoints}>{formatPoints(entry.earnedPoints)} pontos</span>
              </li>
            ))}
          </ol>
        </Block>
      ) : null}

      {!unavailable && entries.length === 0 ? (
        <Block title="Classificação">
          <RankingEmpty periodLabel={ranking.periodLabel} />
        </Block>
      ) : null}

      {entries.length > 0 ? (
        <p className={styles.footNote}>
          O ranking mostra apenas o nome público de cada creator. Nenhum dado de contato é exibido —
          o seu e-mail, telefone e endereço ficam só no seu perfil.
        </p>
      ) : null}
    </>
  );
}
