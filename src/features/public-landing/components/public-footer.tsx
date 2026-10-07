import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/landing.module.css';
import { anchorFor, landingFooterLinks } from '../landing-navigation';

/**
 * 08 — Rodapé mínimo.
 *
 * Logo real + poucos links (FAQ e páginas legais). Redes sociais só quando
 * houver URLs oficiais — não existem ainda, então não há link inventado.
 *
 * `reveal` só é ligado pela landing: o `<LandingReveal />` é dela, e nas outras
 * telas públicas (termos, privacidade) um `data-pl-reveal` ficaria invisível
 * para sempre. Rodapé entra por último, um degrau depois do CTA.
 */
export function PublicFooter({
  authenticated = false,
  rootAnchors = false,
  reveal = false,
}: {
  authenticated?: boolean;
  rootAnchors?: boolean;
  reveal?: boolean;
}) {
  const accountHref = authenticated ? '/app' : '/login';
  const step = (index: number) => (reveal ? { 'data-pl-reveal': '', 'data-pl-index': String(index) } : {});

  return (
    <footer className={styles.footer}>
      <Link href="/" aria-label="NUY Creators início" className={styles.lockup} {...step(0)}>
        <Image
          src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
          alt=""
          width={1281}
          height={301}
          sizes="110px"
          className={styles.lockupImage}
        />
      </Link>

      <nav aria-label="Rodapé" className={styles.footerNav} {...step(1)}>
        {landingFooterLinks.map(([label, href]) => (
          <Link key={href} href={anchorFor(href, rootAnchors)} className={styles.navLink}>
            {label}
          </Link>
        ))}
        <Link href={accountHref} className={styles.navLink}>
          {authenticated ? 'Meu painel' : 'Entrar'}
        </Link>
      </nav>

      <p className={styles.footerCopy} {...step(2)}>
        © 2026 NUY Creators
      </p>
    </footer>
  );
}
