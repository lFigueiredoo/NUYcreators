import Link from 'next/link';
import { Gift } from 'lucide-react';
import { formatPoints } from '../domain/points';
import { redemptionView } from '../domain/status';
import type { RewardView } from '../services/rewards';
import { RedeemRewardForm } from './core-forms';
import { Pill } from './ui/pill';
import { CardMedia, RewardCoverFallback } from './ui/card';
import styles from '../styles/app.module.css';

/**
 * Uma resposta só para "essa recompensa está ao alcance?".
 *
 * Disponível no catálogo ≠ resgatável agora: sem operação de resgate ativa, o
 * texto diz "ainda não disponível" em vez de prometer um botão que não existe.
 * O cartão e a linha compacta usam esta mesma frase — duas redações para o mesmo
 * fato viram duas verdades diferentes na tela.
 */
function rewardAvailability(reward: RewardView, redemptionEnabled: boolean) {
  if (!reward.eligibility.eligible) return reward.eligibility.reason;
  return redemptionEnabled ? 'Disponível para resgate' : 'Resgate ainda não disponível';
}

/**
 * Cartão de recompensa. O botão nunca promete o que o backend não faz: enquanto
 * o fluxo transacional não estiver habilitado, o CTA diz exatamente isso.
 */
export function RewardCard({
  reward,
  redemptionEnabled,
  returnTo,
}: {
  reward: RewardView;
  redemptionEnabled: boolean;
  /** Tela dona do cartão: é para ela que a confirmação do resgate volta. */
  returnTo: string;
}) {
  const redeemed = reward.redemption ? redemptionView(reward.redemption.status) : null;
  const availability = rewardAvailability(reward, redemptionEnabled);
  return (
    // Vitrine do catálogo: foto grande, preço em primeiro plano e o nome com
    // peso de produto — uma loja, onde o item é a estrela do cartão. As classes
    // `reward*` são as diferenças em relação ao cartão de desafio; a base
    // (cartão, borda, rodapé, pílula) é a mesma do resto do produto.
    <article className={styles.challengeCard}>
      {/* A vitrine usa a MESMA caixa 16/9 com foto ou sem: sem imagem gravada, ou
          com o arquivo indisponível, entra a composição de identidade na paleta
          clara — o cartão mantém o esquadro e a grade não desalinha. O nome e o
          custo logo abaixo dizem qual item é; a capa não repete isso em texto. */}
      <CardMedia
        fileId={reward.imageFileId}
        name={reward.name}
        className={styles.rewardMedia}
        cover={<RewardCoverFallback />}
      />
      <div className={styles.rewardBody}>
        <div className={styles.rewardTop}>
          <p className={styles.rewardPrice}>
            <Gift size={15} aria-hidden="true" />
            {formatPoints(reward.pointsCost)} pontos
          </p>
          {redeemed ? <Pill view={redeemed} /> : null}
        </div>
        <h3 className={styles.rewardTitle}>{reward.name}</h3>
        {reward.description ? <p className={styles.challengeText}>{reward.description}</p> : null}
        <div className={styles.challengeFoot}>
          <span className={styles.deadline}>{availability}</span>
          {/* Sem operação configurada não existe CTA — nenhum botão fingindo um
              fluxo que não roda. Com ela, o resgate é transacional: o custo que
              a tela mostrou viaja junto e o servidor recusa se tiver mudado. */}
          {redemptionEnabled && reward.eligibility.eligible ? (
            <RedeemRewardForm
              rewardId={reward.id}
              expectedCost={reward.pointsCost}
              returnTo={returnTo}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Linha compacta de recompensa: foto em miniatura, nome, custo e a mesma frase
 * de disponibilidade do cartão.
 *
 * É a forma que o painel usa quando a recompensa é assunto secundário — no
 * catálogo a foto continua sendo a protagonista do cartão. Sem botão de resgate
 * aqui: quem resgata é a tela que explica o saldo.
 *
 * `spotlight` é a variante de peso: no painel a recompensa deixou de ser um
 * lembrete de rodapé e virou um dos assuntos principais da coluna, então a foto
 * ganha tamanho de vitrine e o custo vira número em destaque. Mesma linha, mesma
 * frase de disponibilidade — só a hierarquia muda.
 */
export function RewardRow({
  reward,
  redemptionEnabled,
  spotlight = false,
}: {
  reward: RewardView;
  redemptionEnabled: boolean;
  spotlight?: boolean;
}) {
  const redeemed = reward.redemption ? redemptionView(reward.redemption.status) : null;
  return (
    <li className={styles.item}>
      {/* `rewardThumb` é o que faz a arte 16/9 entrar inteira neste quadrado: sem
          ela o `cover` do `.thumb` corta 44% da largura e fatia as garrafas das
          pontas. As outras molduras de 56px do produto não entram nesta regra. */}
      <CardMedia
        fileId={reward.imageFileId}
        name={reward.name}
        className={`${spotlight ? styles.thumbSpotlight : styles.thumb} ${styles.rewardThumb}`}
      />
      <div className={styles.itemMain}>
        <h3 className={styles.itemTitle}>
          <Link href="/app/recompensas">{reward.name}</Link>
        </h3>
        {/* O selo desce para a linha de apoio: na coluna estreita do painel ele
            disputava a largura com o nome e partia o título em duas linhas. */}
        <ul className={styles.metaRow}>
          <li className={spotlight ? styles.metaItemStrong : styles.metaItem}>
            <Gift size={14} aria-hidden="true" />
            {formatPoints(reward.pointsCost)} pontos
          </li>
          <li className={styles.metaItem}>{rewardAvailability(reward, redemptionEnabled)}</li>
          {redeemed ? (
            <li className={styles.metaItem}>
              <Pill view={redeemed} />
            </li>
          ) : null}
        </ul>
      </div>
    </li>
  );
}
