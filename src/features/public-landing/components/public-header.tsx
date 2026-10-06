'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import styles from '../styles/landing.module.css';
import { anchorFor, landingAccountLinks, landingNavigation } from '../landing-navigation';

/**
 * 01 — Header da landing (Proposta C).
 *
 * Sobre o creme, sem caixa e sem navy atrás: lockup NUY / CREATORS à
 * esquerda, navegação solta ao centro, Entrar + pill navy à direita.
 *
 * `rootAnchors` só muda o destino das âncoras: dentro da landing elas são
 * relativas (`#faq`); nas páginas de `(public)`, absolutas (`/#faq`) — o header
 * é o mesmo, o alvo é que fica noutra rota.
 */
export function PublicHeader({
  authenticated = false,
  rootAnchors = false,
}: {
  authenticated?: boolean;
  rootAnchors?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const accountLinks = landingAccountLinks(authenticated);
  const navigation = landingNavigation.map(
    ([label, href]) => [label, anchorFor(href, rootAnchors)] as const,
  );

  return (
    <header className={styles.header}>
      <Link href="/" aria-label="NUY Creators início" className={styles.lockup}>
        <span className={styles.lockupMark}>NUY</span>
        <span className={styles.lockupLabel}>CREATORS</span>
      </Link>

      <nav aria-label="Principal" className={styles.nav}>
        {navigation.map(([name, href]) => (
          <Link key={name} href={href} className={styles.navLink}>
            {name}
          </Link>
        ))}
      </nav>

      <div className={styles.accountZone}>
        {accountLinks.map((link) =>
          link.primary ? (
            <Link key={link.href} href={link.href} className={styles.headerCta}>
              {link.label}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <Link key={link.href} href={link.href} className={styles.loginLink}>
              {link.label}
            </Link>
          ),
        )}
        <button
          type="button"
          className={styles.menuButton}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="pl-mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav id="pl-mobile-nav" aria-label="Principal móvel" className={styles.mobileNav}>
          {navigation.map(([name, href]) => (
            <Link
              key={name}
              href={href}
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              {name}
            </Link>
          ))}
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
