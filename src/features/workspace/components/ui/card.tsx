import type { ReactNode } from 'react';
import styles from '../../styles/app.module.css';

/** Bloco base do produto. `navy` é o destaque — usado com parcimônia. */
export function Card({
  tone = 'plain',
  className,
  children,
}: {
  tone?: 'plain' | 'navy';
  className?: string;
  children: ReactNode;
}) {
  const classes = [styles.card, tone === 'navy' ? styles.cardNavy : '', className]
    .filter(Boolean)
    .join(' ');
  return <section className={classes}>{children}</section>;
}
