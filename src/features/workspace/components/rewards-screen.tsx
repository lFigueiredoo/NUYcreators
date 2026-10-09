import Link from 'next/link';
import { ArrowRight, Gift, Info, Package } from 'lucide-react';
import { plural, shortDate } from '../domain/format';
import { formatPoints } from '../domain/points';
import { redemptionView } from '../domain/status';
import type { CatalogView } from '../services/rewards';
import { RewardCard } from './reward-card';
import { Card } from './ui/card';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Recompensas — catálogo operacional e o saldo que pode ser usado nele.
 *
 * O resgate é uma operação transacional (débito no ledger + baixa de estoque) e
 * depende da function `redeem-reward`, ainda não implementada. A tela mostra o
 * catálogo real, informa o saldo real e diz com todas as letras que o resgate
 * ainda não está disponível — nenhum sucesso é simulado no cliente.
 */
export function RewardsScreen({
  catalog,
  redemptionEnabled,
}: {
  catalog: CatalogView;
  redemptionEnabled: boolean;
}) {
  const rewards = catalog.rewards.state === 'ok' ? catalog.rewards.items : [];
  const redemptions = catalog.redemptions.state === 'ok' ? catalog.redemptions.items : [];
  // "Sem conta de pontos" não é "saldo zero": quem nunca pontuou não vê 0 na
  // tela — vê o próprio vazio.
  const hasAccount = catalog.accountState === 'ok' && catalog.hasAccount;

  return (
    <>
      <ScreenHeader
        kicker="Recompensas"
        title="Recompensas NUY"
        intro="Troque seus pontos disponíveis por produtos e experiências da comunidade."
        className={styles.enter}
      />

      {catalog.accountState === 'unavailable' ? (
        <UnavailableState what="seu saldo" />
      ) : hasAccount ? (
        <Card tone="navy" className={`${styles.enter} ${styles.i1}`}>
          <p className={styles.statLabel}>Seu saldo</p>
          <p className={styles.statValueInline}>
            <Gift size={20} aria-hidden="true" />
            {formatPoints(catalog.balance)}
          </p>
          <p className={styles.statHint}>
            Pontos disponíveis para resgate. Seus pontos de jornada não são usados aqui e não
            diminuem.
          </p>
        </Card>
      ) : (
        <EmptyState
          icon={<Gift size={18} />}
          title="Sua jornada começa aqui."
          text="Participe dos desafios da comunidade para criar, compartilhar e evoluir — e trocar seus pontos por recompensas."
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
      )}

      {hasAccount && !redemptionEnabled ? (
        <div className={`${styles.note} ${styles.enter} ${styles.i2}`} role="status">
          <span className={styles.noteIcon} aria-hidden="true">
            <Info size={18} />
          </span>
          <div className={styles.noteBody}>
            <p className={styles.noteTitle}>Resgate ainda não disponível.</p>
            <p className={styles.noteText}>
              O catálogo e o seu saldo são reais, mas a troca por recompensa depende da ativação da
              operação de resgate no servidor. Quando ela entrar no ar, você resgata por aqui — e
              nenhum ponto é debitado antes disso.
            </p>
          </div>
        </div>
      ) : null}

      <Block title="Catálogo">
        {catalog.rewards.state === 'unavailable' ? (
          <UnavailableState what="o catálogo de recompensas" />
        ) : rewards.length > 0 ? (
          // A vitrine é larga de propósito: duas colunas dão à foto do produto o
          // tamanho de um catálogo, não de um widget. Na grade de três o cartão
          // ficava estreito e a imagem virava detalhe do texto.
          // A cascata da vitrine é POSICIONAL, e é a única do produto: a grade é
          // homogênea e o cartão é a estrela, então cada um entra no seu degrau
          // em vez de a grade inteira entrar de uma vez. Aqui o `<Block>` de fora
          // NÃO recebe `.enter` — as amplitudes não se somam.
          <>
            <div className={styles.rewardGrid}>
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  redemptionEnabled={redemptionEnabled}
                  returnTo="/app/recompensas"
                />
              ))}
            </div>
            <p className={styles.footNote}>
              Mostrando {plural(rewards.length, 'recompensa publicada', 'recompensas publicadas')}{' '}
              no catálogo.
            </p>
          </>
        ) : (
          <EmptyState
            icon={<Gift size={18} />}
            title="Nenhuma recompensa publicada ainda."
            text="Quando a equipe NUY publicar as primeiras recompensas, elas aparecem aqui com o custo em pontos."
            action={
              <Link href="/app/desafios" className={`${styles.button} ${styles.buttonPrimary}`}>
                Explorar desafios
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
        )}
      </Block>

      {redemptions.length > 0 ? (
        <Block title="Meus resgates" className={`${styles.enter} ${styles.i3}`}>
          <ul className={styles.list}>
            {redemptions.map((redemption) => {
              const reward = rewards.find((entry) => entry.id === redemption.rewardId);
              return (
                <li key={redemption.id} className={styles.item}>
                  <span className={styles.thumb} aria-hidden="true">
                    <Package size={18} />
                  </span>
                  <div className={styles.itemMain}>
                    <div className={styles.itemHead}>
                      <h3 className={styles.itemTitle}>{reward?.name ?? 'Recompensa resgatada'}</h3>
                      <Pill view={redemptionView(redemption.status)} />
                    </div>
                    <ul className={styles.metaRow}>
                      <li className={styles.metaItem}>
                        {formatPoints(redemption.cost)} Pontos NUY
                      </li>
                      <li className={styles.metaItem}>
                        Solicitado em {shortDate(redemption.requestedAt)}
                      </li>
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </Block>
      ) : null}
    </>
  );
}
