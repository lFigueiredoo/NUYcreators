'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import styles from '../styles/landing.module.css';
import { anchorFor, landingAccountLinks, landingNavigation } from '../landing-navigation';

/**
 * 01 — Header flutuante (pill branca).
 *
 * Segue a referência de perto: a pílula encolhe até o conteúdo — logo real à
 * esquerda, ENTRAR e CRIAR CONTA à direita — sem barra de links no desktop.
 * A navegação por âncoras existe só no painel do menu, disponível no empilhado.
 *
 * Depois de ~96px de rolagem a pílula assenta um degrau (4px de padding e um
 * fio mais definido) e fica assim: o header não se esconde nem reaparece, só
 * acompanha. O estado é um atributo no próprio `<header>`, escrito direto no
 * DOM — não vale um re-render do React a cada quadro de rolagem.
 *
 * POLISH 2: a base da pílula carrega uma linha de progresso de 2px. São duas
 * medidas: `--pl-progress` é a fatia já rolada do documento (dá o comprimento) e
 * `--pl-progress-in` é o acender da linha nos primeiros 700px — no topo ela
 * existe e não se vê. Quem compõe as duas é o CSS; aqui só se escrevem números.
 */
export function PublicHeader({
  authenticated = false,
  rootAnchors = false,
}: {
  authenticated?: boolean;
  rootAnchors?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const accountLinks = landingAccountLinks(authenticated);
  const navigation = landingNavigation.map(
    ([label, href]) => [label, anchorFor(href, rootAnchors)] as const,
  );
  const primary = accountLinks.find((link) => link.primary);
  const secondary = accountLinks.filter((link) => !link.primary);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    let frame = 0;
    /* A altura rolável é lida na medida e na mudança de tamanho, nunca a cada
       quadro: ler `scrollHeight` no meio da rolagem obriga o navegador a
       recalcular o layout. O resto do quadro é aritmética. */
    let scrollable = 0;

    const measure = () => {
      scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };

    const apply = () => {
      frame = 0;
      const y = window.scrollY;
      node.toggleAttribute('data-pl-scrolled', y > 96);
      node.style.setProperty('--pl-progress', scrollable > 0 ? (y / scrollable).toFixed(4) : '0');
      node.style.setProperty('--pl-progress-in', Math.min(1, y / 700).toFixed(3));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    measure();
    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={styles.header} ref={headerRef}>
      <div className={styles.headerPill}>
        {/* Progresso da página: 2px na base da pílula, dentro dela. Decorativo —
            o mesmo dado já está na posição da barra de rolagem. */}
        <span className={styles.headerProgress} aria-hidden="true" />
        <Link href="/" aria-label="NUY Creators início" className={styles.lockup}>
          {/* `alt` vazio de propósito: o rótulo do link já diz o nome. */}
          <Image
            src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
            alt=""
            width={1278}
            height={297}
            sizes="(max-width: 899px) 104px, 152px"
            className={styles.lockupImage}
            loading="eager"
            priority
          />
        </Link>

        {/* Três âncoras discretas, não uma barra de sete itens: o brief pede
            pílula simples. Sem JavaScript as seções continuam alcançáveis —
            âncora nativa não depende do menu. */}
        <nav className={styles.nav} aria-label="Seções da página">
          {navigation.map(([label, href]) => (
            <Link key={label} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.accountZone}>
          {secondary.map((link) => (
            <Link key={link.href} href={link.href} className={styles.loginLink}>
              {link.label}
            </Link>
          ))}
          {primary && (
            <Link href={primary.href} className={styles.headerCta}>
              {primary.label}
            </Link>
          )}
          <button
            type="button"
            className={styles.menuButton}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="pl-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="pl-mobile-nav" aria-label="Principal em tela pequena" className={styles.mobileNav}>
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
          {accountLinks
            .filter((link) => !link.primary)
            .map((link) => (
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
