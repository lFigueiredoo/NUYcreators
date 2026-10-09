import Link from 'next/link';
import styles from '../../styles/app.module.css';

export type TabItem = { id: string; label: string; count?: number };

/**
 * Abas como links: o filtro vive na URL, funciona sem JavaScript, é
 * compartilhável e o botão "voltar" se comporta como esperado.
 */
export function Tabs({
  items,
  current,
  href,
  label,
  className,
}: {
  items: readonly TabItem[];
  current: string;
  href: (id: string) => string;
  label: string;
  className?: string;
}) {
  const classes = [styles.tabs, className].filter(Boolean).join(' ');
  return (
    <nav className={classes} aria-label={label}>
      {items.map((item) => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={href(item.id)}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            aria-current={active ? 'true' : undefined}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className={styles.tabCount}>{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
