import { Gift } from 'lucide-react';
import { formatPoints } from '../domain/points';
import { redemptionView } from '../domain/status';
import type { RewardView } from '../services/rewards';
import { Pill } from './ui/pill';
import styles from '../styles/app.module.css';

/**
 * Cartão de recompensa. O botão nunca promete o que o backend não faz: enquanto
 * o fluxo transacional não estiver habilitado, o CTA diz exatamente isso.
 */
export function RewardCard({
  reward,
  redemptionEnabled,
}: {
  reward: RewardView;
  redemptionEnabled: boolean;
}) {
  const redeemed = reward.redemption ? redemptionView(reward.redemption.status) : null;
  // Disponível no catálogo ≠ resgatável agora: sem operação de resgate ativa, o
  // texto diz "ainda não disponível" em vez de prometer um botão que não existe.
  const availability = !reward.eligibility.eligible
    ? reward.eligibility.reason
    : redemptionEnabled
      ? 'Disponível para resgate'
      : 'Resgate ainda não disponível';
  return (
    <article className={styles.challengeCard}>
      <div
        className={`${styles.challengeMedia} ${reward.imageFileId ? '' : styles.challengeMediaEmpty}`}
        aria-hidden="true"
      >
        {(reward.name.trim()[0] ?? 'N').toUpperCase()}
      </div>
      <div className={styles.challengeBody}>
        <div className={styles.challengeTop}>
          <p className={styles.points}>
            <Gift size={15} aria-hidden="true" />
            {formatPoints(reward.pointsCost)} pontos
          </p>
          {redeemed ? <Pill view={redeemed} /> : null}
        </div>
        <h3 className={styles.challengeTitle}>{reward.name}</h3>
        {reward.description ? <p className={styles.challengeText}>{reward.description}</p> : null}
        <div className={styles.challengeFoot}>
          <span className={styles.deadline}>{availability}</span>
          {/* Sem backend de resgate validado não existe CTA — nenhum botão
              desabilitado fingindo um fluxo que ainda não roda. */}
          {redemptionEnabled && reward.eligibility.eligible ? (
            <button type="button" className={`${styles.button} ${styles.buttonPrimary}`}>
              Resgatar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
