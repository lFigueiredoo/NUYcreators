import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import { landingFontVariables } from '@/features/public-landing/landing-fonts';
// Folha global da superfície autenticada (foco e seleção), escopada por `.nuy-app`
// na raiz do shell — mesma razão e mesmo idioma da `landing-reveal.css`.
import '@/styles/app-surface.css';
import type { Viewer } from '../services/viewer';
import { BottomNav, SidebarNav } from './app-nav';
import { Topbar } from './topbar';
import styles from '../styles/app.module.css';

/**
 * Shell do produto autenticado.
 *
 * Desktop: sidebar creme fixa (marca no topo, navegação principal, conta) +
 * topbar + conteúdo. Mobile: sem sidebar — topbar e barra inferior com cinco
 * destinos. Nenhum dado da usuária é buscado aqui: tudo chega por prop, lido no
 * servidor com a sessão dela.
 */
export function AppShell({
  viewer,
  unread,
  children,
}: {
  viewer: Viewer;
  unread: number | null;
  children: ReactNode;
}) {
  const name = viewer.displayName || viewer.email;
  const initial = (viewer.firstName || name).slice(0, 1).toUpperCase();
  return (
    <div className={`${styles.app} ${landingFontVariables} nuy-app`}>
      {/* O atalho "Pular para conteúdo" é do layout raiz: repetir aqui criaria
          dois links idênticos e o primeiro Tab pararia no lugar errado. */}
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link href="/app" className={styles.brand} aria-label="NUY Creators — início do painel">
            <Image
              src="/brand/logo/nuy-creators-lockup.png"
              alt=""
              width={640}
              height={149}
              sizes="95px"
              className={styles.brandImage}
              loading="eager"
            />
          </Link>
          <SidebarNav unread={unread} />
          <div className={styles.sidebarFooter}>
            <form action={logoutAction}>
              <button type="submit" className={`${styles.navLink} ${styles.navLinkButton}`}>
                <span className={styles.navIcon} aria-hidden="true">
                  <LogOut size={17} />
                </span>
                Sair
              </button>
            </form>
          </div>
        </aside>
        <div className={styles.body}>
          <Topbar name={name} email={viewer.email} initial={initial} unread={unread} />
          <main id="main" className={styles.main}>
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
