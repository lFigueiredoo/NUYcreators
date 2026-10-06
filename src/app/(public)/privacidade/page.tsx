import styles from '@/features/public-landing/styles/landing.module.css';

/**
 * Privacidade — mesma identidade pública da landing (Sprint 4B).
 * Conteúdo verbatim: o aviso definitivo aguarda aprovação jurídica e a página
 * não promete bases legais que ainda não foram publicadas.
 */
export const metadata = { title: 'Privacidade' };

export default function Privacy() {
  return (
    <article className={styles.legal}>
      <p className={styles.sectionEyebrow}>Cuidado com seus dados</p>
      <h1 className={styles.legalTitle}>Privacidade</h1>
      <p className={styles.legalNote}>
        O aviso de privacidade definitivo aguarda aprovação jurídica. Antes do lançamento, serão
        publicados controlador, contato, bases legais, finalidades, retenção e meios de exercício
        dos direitos previstos na LGPD. Nenhum consentimento de marketing é solicitado nesta versão.
      </p>
    </article>
  );
}
