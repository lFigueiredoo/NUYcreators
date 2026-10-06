import Link from 'next/link';
import { ArrowRight, Coins, Compass, Receipt } from 'lucide-react';
import { shortDate } from '../domain/format';
import { formatPoints, transactionSign } from '../domain/points';
import type { JourneyView } from '../services/journey';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Pontos — os dois números do domínio, lado a lado e nunca somados.
 *
 * `availableBalance` é gastável em recompensa; `qualifyingPoints` define o nível
 * e não diminui no resgate (docs/database.md §Pontos). O extrato é o ledger real,
 * lançamento por lançamento, sem lançamento inventado.
 */
export function PointsScreen({ journey }: { journey: JourneyView }) {
  const { summary, progress, transactions, accountState } = journey;
  const hasAccount = summary.hasAccount;
  const ledger = transactions.state === 'ok' ? transactions.items : [];

  return (
    <>
      <ScreenHeader
        kicker="Pontos"
        title="Seus pontos"
        intro="Pontos disponíveis podem ser usados em recompensas. Pontos de jornada determinam seu nível e não diminuem quando você resgata."
      />

      {accountState === 'unavailable' ? (
        <UnavailableState what="seus pontos" />
      ) : hasAccount ? (
        <div className={styles.balanceGrid}>
          <Card>
            <p className={styles.statLabel}>Pontos disponíveis</p>
            <p className={styles.statValueInline}>
              <Coins size={20} aria-hidden="true" />
              {formatPoints(summary.availableBalance)}
            </p>
            <p className={styles.statHint}>
              É o que você pode trocar por recompensas no catálogo NUY.{' '}
              <Link href="/app/recompensas" className={styles.blockLink}>
                Ver recompensas
              </Link>
            </p>
          </Card>
          <Card>
            <p className={styles.statLabel}>Pontos de jornada</p>
            <p className={styles.statValueInline}>{formatPoints(summary.qualifyingPoints)}</p>
            <p className={styles.statHint}>
              Soma dos pontos conquistados nos desafios. Definem o seu nível e não diminuem no
              resgate.
            </p>
          </Card>
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

      {hasAccount && progress ? (
        <Block title="Sua jornada">
          <Card>
            <div className={styles.levelRow}>
              <div>
                <p className={styles.statLabel}>Nível atual</p>
                <p className={styles.levelInline}>{progress.current.name}</p>
              </div>
              <div className={styles.levelRowSide}>
                <p className={styles.statLabel}>
                  {progress.next ? 'Próximo nível' : 'Nível máximo'}
                </p>
                <p className={styles.levelInline}>
                  {progress.next ? progress.next.name : progress.current.name}
                </p>
              </div>
            </div>
            <Progress
              value={progress.ratio * 100}
              max={100}
              label={
                progress.next
                  ? `${progress.percent}% do caminho para ${progress.next.name}`
                  : 'Nível mais alto da jornada NUY'
              }
            />
            <p className={styles.statHint}>
              {progress.next && progress.remaining !== null
                ? `Faltam ${formatPoints(progress.remaining)} pontos de jornada para ${progress.next.name}.`
                : 'Você está no nível mais alto da jornada NUY.'}
            </p>
          </Card>
        </Block>
      ) : null}

      <Block title="Extrato">
        {transactions.state === 'unavailable' ? (
          <UnavailableState what="seu extrato" />
        ) : ledger.length > 0 ? (
          <ul className={styles.ledger}>
            {ledger.map((transaction) => {
              const sign = transactionSign(transaction.amount);
              return (
                <li key={transaction.id} className={styles.ledgerItem}>
                  <div className={styles.ledgerMain}>
                    <h3 className={styles.itemTitle}>
                      {transaction.description || 'Movimentação de pontos'}
                    </h3>
                    <span className={styles.ledgerDate}>
                      {shortDate(transaction.createdAt)}
                      {transaction.type ? ` · ${transaction.type}` : ''}
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
              <Receipt size={16} aria-hidden="true" />
              Sua história de pontos começa quando você participa.
            </h3>
            <p>
              Cada aprovação em desafio registra os pontos aqui, com data, valor e origem. Nenhuma
              movimentação aparece antes de existir de verdade.
            </p>
            <Link href="/app/desafios" className={styles.blockLink}>
              Ver desafios disponíveis
            </Link>
          </Card>
        )}
      </Block>
    </>
  );
}
