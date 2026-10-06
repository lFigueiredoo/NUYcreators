import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 05 — Desafio do mês (Proposta C).
 *
 * O bloco escuro da página, como na referência: banner navy com a still life
 * de produto e flores sangrando pela direita, copy na régua editorial.
 *
 * Estado de pré-lançamento, não de campanha: não há desafio no backend, então
 * a seção NÃO anuncia data, prazo, pontos nem participantes — só o convite.
 * O `products-floral` (1448×1086) é a foto em alta resolução da linha; a foto
 * de campanha da folha tem texto rasterizado e 562×265 nativos, e cobriria o
 * banner com upscale.
 */
export function Challenge() {
  return (
    <section id="desafios" className={styles.challenge} aria-labelledby="pl-challenge-title">
      <figure className={styles.challengeMedia} data-pl-reveal>
        <Image
          src="/brand/nuy-creators-v2/products/products-floral.webp"
          alt="Frascos da linha NUY entre flores brancas sobre a mesa da sala"
          width={1448}
          height={1086}
          quality={88}
          sizes="(max-width: 899px) 100vw, min(64vw, 940px)"
          className={styles.challengeImage}
          loading="lazy"
        />
        <span className={styles.challengeScrim} aria-hidden="true" />
      </figure>

      <div className={styles.challengeCopy}>
        {/* Manuscrito da referência, agora em creme: sobre o navy o ameixa do
            hero desapareceria. Fica na coluna de copy (direita dela) para não
            cair sobre a parte clara da foto em nenhuma largura. */}
        <p className={styles.challengeScript} data-pl-reveal>
          Pequenas rotinas,
          <br />
          grandes sensações.
        </p>

        <p className={styles.challengeEyebrow} data-pl-reveal>
          DESAFIO DO MÊS
        </p>

        <h2 id="pl-challenge-title" className={styles.challengeTitle} data-pl-reveal>
          Casa perfumada,
          <br />
          <em>rotina mais feliz.</em>
        </h2>

        <p className={styles.challengeBody} data-pl-reveal>
          Participe dos desafios, crie conteúdos e conquiste recompensas exclusivas.
        </p>

        <div className={styles.challengeActions} data-pl-reveal>
          <Link href="/cadastro" className={styles.challengeCta}>
            Quero participar
            <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
          </Link>
        </div>

        <p className={styles.challengeNote} data-pl-reveal>
          O primeiro desafio está em preparação — quem entra agora recebe o convite.
        </p>
      </div>
    </section>
  );
}
