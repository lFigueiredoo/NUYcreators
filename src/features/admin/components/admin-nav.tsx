'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ScanEye } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import type { AdminDestination } from './nav-items';
import { adminCurrent, adminNavEntries, adminSectionLabel } from './nav-items';
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
    <nav className={appStyles.nav} aria-label="Administração">
      <p className={appStyles.navLabel}>Operação</p>
      {entries.map((entry) => {
        const active = adminCurrent(pathname, entry.href);
        const Icon = entry.icon;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            className={
              active ? `${appStyles.navLink} ${appStyles.navLinkActive}` : appStyles.navLink
            }
            aria-current={active ? 'page' : undefined}
          >
            <span className={appStyles.navIcon}>
              <Icon size={17} aria-hidden="true" />
            </span>
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Topbar: em que seção estamos, quem opera, e como voltar ao produto. */
export function AdminTopbar({ name, email, role }: { name: string; email: string; role: string }) {
  const pathname = usePathname();
  return (
    <header className={appStyles.topbar}>
      <div className={appStyles.topbarLead}>
        <p className={appStyles.topbarKicker}>{adminSectionLabel(pathname)}</p>
      </div>
      <div className={appStyles.topbarActions}>
        <div className={styles.operator}>
          <div>
            <p className={styles.operatorName}>{name || email}</p>
            <p className={styles.operatorRole}>{role}</p>
          </div>
        </div>
        <Link href="/app" className={`${appStyles.button} ${appStyles.buttonGhost}`}>
          <ScanEye size={16} aria-hidden="true" />
          Ver como creator
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className={`${appStyles.iconButton} ${appStyles.iconButtonPlain}`}
            aria-label="Sair da conta"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}
