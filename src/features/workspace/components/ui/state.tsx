import type { ReactNode } from 'react';
import { Flower2, Info } from 'lucide-react';
import { RetryButton } from './retry';
import styles from '../../styles/app.module.css';

/**
 * Vazio e indisponível são estados diferentes e não se disfarçam:
 *  - `EmptyState` = não existe nada ainda (copy própria de cada tela);
 *  - `UnavailableState` = não conseguimos ler (erro amigável + tentar de novo).
 */
export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        {icon ?? <Flower2 size={18} />}
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {text ? <p className={styles.emptyText}>{text}</p> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

export function UnavailableState({
  what,
  detail,
}: {
  /** O que não pôde ser carregado, em linguagem simples. */
  what: string;
  detail?: string;
}) {
  return (
    <div className={styles.note} role="status">
      <span className={styles.noteIcon} aria-hidden="true">
        <Info size={18} />
      </span>
      <div className={styles.noteBody}>
        <p className={styles.noteTitle}>Não conseguimos carregar {what} agora.</p>
        <p className={styles.noteText}>
          {detail ?? 'Nada foi perdido — é uma falha temporária de leitura.'}
        </p>
        <div className={styles.noteAction}>
          <RetryButton />
        </div>
      </div>
    </div>
  );
}

/** Esqueleto discreto de carregamento: sem spinner gigante no centro. */
export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '38%' }} />
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={`${styles.skeleton} ${styles.skeletonLine}`}
          style={{ width: index === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className={`${styles.grid} ${styles.gridThree}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
      ))}
    </div>
  );
}
