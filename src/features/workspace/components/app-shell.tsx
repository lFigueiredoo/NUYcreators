import { Suspense, type ReactNode } from 'react';
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
import { Flash } from './flash';
import { Topbar } from './topbar';
import styles from '../styles/app.module.css';

/**
 * Shell do produto autenticado.
 *
 * Desktop: sidebar branca fixa (marca no topo, navegação principal, conta) +
 * header fino + conteúdo. Mobile: sem sidebar — header com a marca e barra
 * inferior com cinco destinos mais "Mais". Nenhum dado da usuária é buscado
 * aqui: tudo chega por prop, lido no servidor com a sessão dela.
 *
 * `styles.creator` marca a raiz da experiência da creator. O /admin monta o
 * mesmo esqueleto com o módulo da administração e sem esta classe, então a
 * escala tipográfica e os rótulos de 16px valem só aqui.
 */
export function AppShell({
  viewer,
  unread,
  level,
  children,
}: {
  viewer: Viewer;
  unread: number | null;
  level: string | null;
  children: ReactNode;
}) {
  const name = viewer.displayName || viewer.email;
  const initial = (viewer.firstName || name).slice(0, 1).toUpperCase();
  return (
    <div className={`${styles.app} ${styles.creator} ${landingFontVariables} nuy-app`}>
      {/* O atalho "Pular para conteúdo" é do layout raiz: repetir aqui criaria
          dois links idênticos e o primeiro Tab pararia no lugar errado. */}
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link href="/app" className={styles.brand} aria-label="NUY Creators — início do painel">
            <Image
              src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
              alt=""
              width={1278}
              height={297}
              sizes="104px"
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
          <Topbar
            name={name}
            email={viewer.email}
            initial={initial}
            unread={unread}
            level={level}
          />
          <main id="main" className={styles.main}>
            {/* Aviso da última ação, no destino dela. Fica no shell para valer
                em qualquer tela para onde a ação mandar a creator. */}
            <Suspense fallback={null}>
              <Flash />
            </Suspense>
            {children}
          </main>
        </div>
      </div>
      <BottomNav unread={unread} />
    </div>
  );
}
