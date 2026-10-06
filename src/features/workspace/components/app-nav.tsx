'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bottomNav, isCurrent, primaryNav, secondaryNav, type NavEntry } from './navigation';
import styles from '../styles/app.module.css';

function NavLink({ entry, badge }: { entry: NavEntry; badge?: number | null }) {
  const pathname = usePathname();
  const active = isCurrent(pathname, entry.href);
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.navIcon}>
        <Icon size={17} aria-hidden="true" />
      </span>
      {entry.label}
      {badge ? <span className={styles.navBadge}>{badge}</span> : null}
    </Link>
  );
}

/** Sidebar do desktop: principal + utilitários. */
export function SidebarNav({ unread }: { unread: number | null }) {
  return (
    <>
      <nav className={styles.nav} aria-label="Navegação principal">
        {primaryNav.map((entry) => (
          <NavLink key={entry.href} entry={entry} />
        ))}
      </nav>
      <nav className={`${styles.nav} ${styles.navSecondary}`} aria-label="Conta">
        {secondaryNav.map((entry) => (
          <NavLink
            key={entry.href}
            entry={entry}
            badge={entry.href === '/app/notificacoes' ? unread : undefined}
          />
        ))}
      </nav>
    </>
  );
}

/** Barra inferior do mobile. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.bottomNav} aria-label="Navegação principal">
      {bottomNav.map((entry) => {
        const active = isCurrent(pathname, entry.href);
        const Icon = entry.icon;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            className={
              active ? `${styles.bottomLink} ${styles.bottomLinkActive}` : styles.bottomLink
            }
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
