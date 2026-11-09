'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { anchorFor, landingNavigation } from './landing-navigation';
import styles from './styles/editorial-header.module.css';

const mobileNavId = 'editorial-mobile-nav';

export function EditorialHeader() {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const capsule = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const mobileNav = useRef<HTMLElement>(null);

  function closeMenu(focusTarget: 'toggle' | 'brand' = 'toggle') {
    if (
      mobileNav.current?.contains(document.activeElement) ||
      (focusTarget === 'brand' && toggle.current === document.activeElement)
    ) {
      (focusTarget === 'brand' ? brand : toggle).current?.focus({ preventScroll: true });
    }
    setOpen(false);
  }

  useEffect(() => {
    if (open || !rendered) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setRendered(false), reducedMotion ? 0 : 160);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;

    const desktop = window.matchMedia('(width > 850px)');
    const dismissOnDesktop = () => {
      if (desktop.matches) closeMenu('brand');
    };
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !capsule.current?.contains(event.target)) {
        closeMenu();
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      toggle.current?.focus({ preventScroll: true });
      setOpen(false);
    };

    desktop.addEventListener('change', dismissOnDesktop);
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      desktop.removeEventListener('change', dismissOnDesktop);
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [open]);

  return (
    <header className={styles.header}>
      <div
        ref={capsule}
        className={styles.capsule}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <Link ref={brand} href="/#topo" aria-label="NUY Creators início" className={styles.brand}>
          <Image
            src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
            alt=""
            width={1278}
            height={297}
            sizes="(max-width: 350px) 142px, (max-width: 620px) 151px, 174px"
            loading="eager"
            className={styles.logo}
          />
        </Link>
        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {landingNavigation.map(([label, hash]) => (
            <a key={hash} href={anchorFor(hash, true)} className={styles.navLink}>
              {label}
            </a>
          ))}
        </nav>
        <Link href="/app" prefetch={false} className={`${styles.cta} ${styles.desktopCta}`}>
          ACESSAR
        </Link>
        <button
          ref={toggle}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={mobileNavId}
          onClick={() => {
            if (open) {
              closeMenu();
            } else {
              setRendered(true);
              setOpen(true);
            }
          }}
        >
          Menu
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <nav
          ref={mobileNav}
          id={mobileNavId}
          className={styles.mobileNav}
          aria-label="Navegação no celular"
          aria-hidden={!open}
          inert={!open}
          data-open={open}
          hidden={!rendered}
        >
          {landingNavigation.map(([label, hash]) => (
            <a
              key={hash}
              href={anchorFor(hash, true)}
              className={styles.navLink}
              onClick={() => closeMenu()}
            >
              {label}
            </a>
          ))}
          <Link href="/app" prefetch={false} className={styles.cta} onClick={() => closeMenu()}>
            ACESSAR
          </Link>
        </nav>
      </div>
    </header>
  );
}
