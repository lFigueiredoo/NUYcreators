'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, Gift, LogOut, Trophy, UserRound } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import { sectionLabel } from './navigation';
import styles from '../styles/app.module.css';

/**
 * Topbar do produto: contexto da seção à esquerda, notificações e conta à
 * direita. Sem saldo, sem posição de ranking, sem medalha — esses números
 * pertencem às telas que os explicam, não a um cromo fixo.
 *
 * O nome aparece uma vez só, no botão da conta: a saudação da Início é o `h1`
 * da tela, e repetir o nome no cromo seria eco.
 */
export function Topbar({
  name,
  email,
  initial,
  unread,
}: {
  name: string;
  email: string;
  initial: string;
  unread: number | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const unreadLabel =
    unread === null
      ? 'Notificações'
      : unread === 0
        ? 'Notificações, nenhuma não lida'
        : `Notificações, ${unread} não ${unread === 1 ? 'lida' : 'lidas'}`;

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLead}>
        <p className={styles.topbarKicker}>{sectionLabel(pathname)}</p>
      </div>
      <div className={styles.topbarActions}>
        <Link
          href="/app/notificacoes"
          className={`${styles.iconButton} ${styles.iconButtonPlain}`}
          aria-label={unreadLabel}
        >
          <span className={styles.iconWrap}>
            <Bell size={18} aria-hidden="true" />
            {unread ? <span className={styles.dot}>{unread > 9 ? '9+' : unread}</span> : null}
          </span>
        </Link>
        <div className={styles.menuWrap} ref={wrap}>
          <button
            type="button"
            className={styles.avatarButton}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span className={styles.avatarInitial} aria-hidden="true">
              {initial}
            </span>
            <span className={styles.avatarLabel}>{name}</span>
          </button>
          {open ? (
            <div className={styles.menuPanel} aria-label="Sua conta">
              <div className={styles.menuIdentity}>
                <p className={styles.menuName}>{name}</p>
                <p className={styles.menuEmail}>{email}</p>
              </div>
              <Link href="/app/perfil" className={styles.menuItem} onClick={() => setOpen(false)}>
                <UserRound size={16} aria-hidden="true" />
                Meu perfil
              </Link>
              <Link
                href="/app/notificacoes"
                className={styles.menuItem}
                onClick={() => setOpen(false)}
              >
                <Bell size={16} aria-hidden="true" />
                Notificações
              </Link>
              {/* No desktop estes dois vivem na sidebar; no mobile, a barra
                  inferior só tem cinco destinos e eles ficam aqui. */}
              <Link
                href="/app/recompensas"
                className={`${styles.menuItem} ${styles.menuExtra}`}
                onClick={() => setOpen(false)}
              >
                <Gift size={16} aria-hidden="true" />
                Recompensas
              </Link>
              <Link
                href="/app/ranking"
                className={`${styles.menuItem} ${styles.menuExtra}`}
                onClick={() => setOpen(false)}
              >
                <Trophy size={16} aria-hidden="true" />
                Ranking
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={styles.menuItem}>
                  <LogOut size={16} aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
