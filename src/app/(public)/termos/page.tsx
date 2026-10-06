import styles from '@/features/public-landing/styles/landing.module.css';

/**
 * Termos de uso — mesma identidade pública da landing (Sprint 4B).
 * O conteúdo é o mesmo de antes, verbatim: a página declara que os termos
 * definitivos aguardam aprovação jurídica e que o cadastro depende deles.
 */
export const metadata = { title: 'Termos de uso' };

export default function Terms() {
  return (
    <article className={styles.legal}>
      <p className={styles.sectionEyebrow}>Transparência</p>
      <h1 className={styles.legalTitle}>Termos de uso</h1>
      <p className={styles.legalNote}>
        Os termos definitivos aguardam aprovação jurídica. Esta página não constitui uma política
        legal final. O lançamento público do cadastro depende de termos versionados, política de
        idade e condições de participação aprovados pela NUY.
      </p>
    </article>
  );
}
