import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/landing.module.css';

/**
 * 07 — CTA final (fundo claro).
 *
 * Logotipo real, convite direto e dois caminhos: criar conta (navy) ou entrar
 * (branco com borda navy). Nenhum bloco operacional, nenhum número.
 *
 * POLISH 2: o ato abre com o segundo — e último — divisor dourado da landing, a
 * luz radial cresce de .97 para 1 na chegada e depois anda no máximo 8px com a
 * rolagem da própria seção (`data-pl-depth="view"`). É a mesma luz do hero
 * respondendo ao desfecho, e a última coisa que se move na página.
 */
export function CtaFinal({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <section
      id="cta-final"
      className={styles.ctaFinal}
      aria-labelledby="pl-cta-final-title"
      /* O `LandingDepth` escreve aqui o progresso da SEÇÃO na viewport. */
      data-pl-depth="view"
    >
      {/* O campo existe para separar o reveal do deslocamento: quem anima (o
          campo) não pode ser quem se move (a luz). */}
      <span className={styles.ctaGlowField} aria-hidden="true" data-pl-reveal data-pl-index="0">
        <span className={styles.ctaGlow} />
      </span>

      <span
        className={styles.divider}
        aria-hidden="true"
        data-pl-reveal="line"
        data-pl-index="0"
      />

      <Image
        src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
        alt="NUY Creators"
        width={1281}
        height={301}
        sizes="220px"
        className={styles.ctaLogo}
        data-pl-reveal
        data-pl-index="1"
      />

      <h2
        id="pl-cta-final-title"
        className={styles.sectionTitle}
        data-pl-reveal
        data-pl-index="2"
      >
        Pronta para fazer parte
        <br />
        da NUY Creators?
      </h2>

      <p className={styles.ctaBody} data-pl-reveal data-pl-index="3">
        Crie, compartilhe e viva experiências com quem também ama cuidar da casa.
      </p>

      <div className={styles.ctaActions} data-pl-reveal data-pl-index="4">
        {authenticated ? (
          <Link href="/app" className={styles.primaryButton}>
            IR PARA MEU PAINEL
          </Link>
        ) : (
          <>
            <Link href="/cadastro" className={styles.primaryButton}>
              CRIAR MINHA CONTA
            </Link>
            <Link href="/login" className={styles.secondaryButton}>
              ENTRAR
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
