import type { ReactNode } from 'react';
import styles from '../styles/legal.module.css';

/**
 * Moldura de um documento legal público (termos e privacidade).
 *
 * O chrome — header, rodapé e âncoras absolutas — vem do layout de `(public)`;
 * aqui vive só o miolo: sobretítulo, título, linha de versão, o aviso de que a
 * versão é provisória e o corpo. Documento se lê; não tem reveal nem movimento,
 * e por isso nada aqui depende do IntersectionObserver da landing.
 *
 * O aviso entra como propriedade (e não como texto fixo) porque cada página
 * declara a provisoriedade na própria voz: os termos no topo, antes da primeira
 * cláusula; a política no fecho do corpo, junto das demais ressalvas.
 *
 * O corpo carrega `data-testid` porque a medida de leitura é contratual
 * (`experience-boundary.spec.ts`): o nome da classe é hasheado pelo CSS Module
 * e o teste não pode depender dele. É o único dado do componente que existe
 * para o gate, não para a página.
 */
export function LegalDocument({
  eyebrow,
  title,
  subtitle,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  notice?: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.document}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
      </header>
      <div className={styles.body} data-testid="legal-body">
        {children}
      </div>
    </article>
  );
}
