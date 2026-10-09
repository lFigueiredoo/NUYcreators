import type { ReactNode } from 'react';
import styles from '../../styles/app.module.css';

/** Cabeçalho padrão das telas: sobrancelha, título e uma linha de contexto. */
export function ScreenHeader({
  kicker,
  title,
  intro,
  action,
  className,
}: {
  kicker?: string;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const classes = [styles.screenHeader, className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <div>
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <h1>{title}</h1>
        {intro ? <p className={styles.screenIntro}>{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Bloco de conteúdo com título e link opcional — a régua da página. */
export function Block({
  title,
  link,
  children,
  className,
}: {
  title?: ReactNode;
  link?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const classes = [styles.block, className].filter(Boolean).join(' ');
  return (
    <section className={classes}>
      {title ? (
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle}>{title}</h2>
          {link}
        </div>
      ) : null}
      {children}
    </section>
  );
}
