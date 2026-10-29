'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, ScanEye } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import type { AdminDestination } from './nav-items';
import { adminCurrent, adminNavEntries, adminNavSections, adminSectionLabel } from './nav-items';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';

/**
 * Navegação da administração.
 *
 * Recebe só os IDs que quem opera PODE abrir (apurados no servidor a partir de
 * membership confirmada). Não é barreira — é navegação: rota fora do papel
 * continua barrada no servidor mesmo que alguém digite a URL.
 */
export function AdminNav({ allowed }: { allowed: AdminDestination[] }) {
  const pathname = usePathname();
  const entries = adminNavEntries.filter((entry) => allowed.includes(entry.id));
  return (
    <nav className={`${appStyles.nav} ${styles.nav}`} aria-label="Administração">
      {adminNavSections(entries).map((section) => (
        <div className={styles.navSection} key={section.label}>
          <p className={`${appStyles.navLabel} ${styles.navLabel}`}>{section.label}</p>
          <div className={styles.navItems}>
            {section.entries.map((entry) => (
              <AdminNavLink key={entry.href} entry={entry} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminNavLink({
  entry,
  pathname,
  mobile = false,
}: {
  entry: (typeof adminNavEntries)[number];
  pathname: string;
  mobile?: boolean;
}) {
  const active = adminCurrent(pathname, entry.href);
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      className={
        active
          ? `${appStyles.navLink} ${appStyles.navLinkActive} ${styles.navLink} ${mobile ? styles.mobileNavLink : ''}`
          : `${appStyles.navLink} ${styles.navLink} ${mobile ? styles.mobileNavLink : ''}`
      }
      aria-current={active ? 'page' : undefined}
    >
      <span className={appStyles.navIcon}>
        <Icon size={17} aria-hidden="true" />
      </span>
      {entry.label}
    </Link>
  );
}

/** Topbar: em que seção estamos, quem opera, e como voltar ao produto. */
export function AdminTopbar({
  name,
  email,
  role,
  allowed,
}: {
  name: string;
  email: string;
  role: string;
  allowed: AdminDestination[];
}) {
  const pathname = usePathname();
  const displayName = name || email;
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'N';
  const entries = adminNavEntries.filter((entry) => allowed.includes(entry.id));
  return (
    <header className={`${appStyles.topbar} ${styles.topbar}`}>
      <div className={`${appStyles.topbarLead} ${styles.topbarLead}`}>
        <Link href="/admin" className={styles.mobileBrand} aria-label="Início da administração">
          <Image
            src="/brand/logo/nuy-creators-lockup.png"
            alt="NUY Creators"
            width={640}
            height={149}
            sizes="92px"
            priority
          />
        </Link>
        <p className={appStyles.topbarKicker}>{adminSectionLabel(pathname)}</p>
      </div>
      <div className={`${appStyles.topbarActions} ${styles.topbarActions}`}>
        <div className={`${styles.operator} ${styles.desktopAction}`}>
          <span className={styles.operatorAvatar} aria-hidden="true">
            {initial}
          </span>
          <div>
            <p className={styles.operatorName}>{displayName}</p>
            <p className={styles.operatorRole}>{role}</p>
          </div>
        </div>
        <Link
          href="/app"
          className={`${appStyles.button} ${appStyles.buttonGhost} ${styles.desktopAction}`}
        >
          <ScanEye size={16} aria-hidden="true" />
          Ver como creator
        </Link>
        <form action={logoutAction} className={styles.desktopAction}>
          <button
            type="submit"
            className={`${appStyles.iconButton} ${appStyles.iconButtonPlain}`}
            aria-label="Sair da conta"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </form>
        <details className={styles.mobileMenu}>
          <summary>
            <Menu size={19} aria-hidden="true" />
            <span>Menu</span>
          </summary>
          <div className={styles.mobileMenuPanel}>
            <div className={styles.mobileOperator}>
              <span className={styles.operatorAvatar} aria-hidden="true">
                {initial}
              </span>
              <div>
                <p className={styles.operatorName}>{displayName}</p>
                <p className={styles.operatorRole}>{role}</p>
              </div>
            </div>
            <nav className={styles.mobileNav} aria-label="Menu da administração">
              {adminNavSections(entries).map((section) => (
                <div className={styles.mobileNavSection} key={section.label}>
                  <p className={styles.mobileNavLabel}>{section.label}</p>
                  {section.entries.map((entry) => (
                    <AdminNavLink key={entry.href} entry={entry} pathname={pathname} mobile />
                  ))}
                </div>
              ))}
            </nav>
            <div className={styles.mobileMenuFooter}>
              <Link href="/app" className={styles.mobileUtility}>
                <ScanEye size={17} aria-hidden="true" />
                Ver como creator
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={styles.mobileUtility}>
                  <LogOut size={17} aria-hidden="true" />
                  Sair da conta
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
