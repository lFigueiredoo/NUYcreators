'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { logoutAction } from '@/features/auth/services/actions';
import { sectionLabel } from './navigation';
import styles from '../styles/app.module.css';

/**
 * Header do produto: contexto da seção à esquerda, notificações e identidade à
 * direita. Sem saldo, sem posição de ranking, sem medalha — esses números
 * pertencem às telas que os explicam, não a um cromo fixo.
 *
 * A identidade são duas linhas curtas, nome e nível. O nível vem lido do
 * servidor (`loadLevelName`) e some quando não há conta ou níveis publicados:
 * melhor um nome sozinho do que um "Sem nível" inventado.
 */
export function Topbar({
  name,
  email,
  initial,
  unread,
  level,
}: {
  name: string;
  email: string;
  initial: string;
  unread: number | null;
  level: string | null;
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
        {/* A marca só aparece no mobile, quando não há sidebar — mesma folha,
            dois estados, nenhuma duplicata de conteúdo: a imagem é decorativa
            nos dois lugares (o link da sidebar tem o rótulo acessível). */}
        <Image
          src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
          alt=""
          width={1278}
          height={297}
          sizes="84px"
          className={styles.brandTopbar}
        />
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
            <span className={styles.avatarText}>
              <span className={styles.avatarLabel}>{name}</span>
              {level ? <span className={styles.avatarLevel}>{level}</span> : null}
            </span>
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
              {/* Recompensas e Ranking saíram daqui: no mobile eles agora vivem
                  na folha "Mais" da barra inferior, junto do resto que não cabe
                  nos cinco destinos. Um destino, um lugar. */}
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
