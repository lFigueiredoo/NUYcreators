'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutGrid, LogOut } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import {
  bottomNav,
  isCurrent,
  moreNav,
  primaryNav,
  secondaryNav,
  type NavEntry,
} from './navigation';
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

/**
 * Sidebar do desktop: principal + utilitários.
 *
 * Os dois blocos de navegação ficam dentro de um contêiner que rola por conta
 * própria. Em tela baixa o excedente da lista — e não a marca nem o rodapé, onde
 * "Sair" mora — passa a ser alcançável: antes ele pintava ABAIXO da viewport, e
 * a barra é `sticky` com `height: 100dvh`, então rolar a página nunca o trazia
 * de volta. Acima do limiar não há excedente e a composição é idêntica.
 */
export function SidebarNav({ unread }: { unread: number | null }) {
  return (
    <div className={styles.navScroll}>
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
    </div>
  );
}

/**
 * Barra inferior do mobile: cinco destinos fixos mais "Mais".
 *
 * O sexto lugar abre a folha com o que não cabe (Recompensas, Ranking,
 * Notificações) e com a saída. É estado local do componente: nenhuma rota nova,
 * nenhum destino inventado — são os mesmos links da sidebar do desktop.
 *
 * Os cinco primeiros não podem sair nem mudar de nome: são a navegação de
 * polegar, e a barra não é lugar de esconder o que a creator mais usa.
 */
export function BottomNav({ unread }: { unread: number | null }) {
  const pathname = usePathname();
  // A folha pertence à tela onde foi aberta: guardar QUAL caminho a abriu, em vez
  // de um liga/desliga, faz a troca de tela fechá-la sozinha — inclusive o voltar
  // do navegador, e sem efeito nenhum sincronizando estado.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenedAt(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
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
        <button
          type="button"
          className={open ? `${styles.bottomLink} ${styles.bottomLinkActive}` : styles.bottomLink}
          aria-expanded={open}
          aria-controls="mais-secoes"
          onClick={() => setOpenedAt(open ? null : pathname)}
        >
          <LayoutGrid size={19} aria-hidden="true" />
          Mais
        </button>
      </nav>
      {open ? (
        <>
          <button
            type="button"
            className={styles.moreBackdrop}
            aria-label="Fechar menu"
            onClick={() => setOpenedAt(null)}
          />
          <nav className={styles.moreSheet} id="mais-secoes" aria-label="Mais seções">
            <p className={styles.moreTitle}>Mais</p>
            {moreNav.map((entry) => {
              const Icon = entry.icon;
              const badge = entry.href === '/app/notificacoes' ? unread : null;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={styles.moreItem}
                  aria-current={isCurrent(pathname, entry.href) ? 'page' : undefined}
                  onClick={() => setOpenedAt(null)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {entry.label}
                  {badge ? <span className={styles.moreBadge}>{badge}</span> : null}
                </Link>
              );
            })}
            <form action={logoutAction}>
              <button type="submit" className={styles.moreItem}>
                <LogOut size={18} aria-hidden="true" />
                Sair
              </button>
            </form>
          </nav>
        </>
      ) : null}
    </>
  );
}
