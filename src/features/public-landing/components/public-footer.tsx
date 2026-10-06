import Link from 'next/link';
import styles from '../styles/landing.module.css';
import { anchorFor, landingFooterNavigation } from '../landing-navigation';

/**
 * 11 — Rodapé (Proposta C).
 *
 * Fecha a página no claro, com a mesma régua do resto: lockup NUY / CREATORS,
 * as seções na ordem do documento e o acesso. Os links são reais — âncoras da
 * própria landing (absolutas quando o rodapé é montado fora dela), `/login` ou
 * `/app` conforme a sessão, e as duas páginas legais. Nenhum `#` solto.
 */
export function PublicFooter({
  authenticated = false,
  rootAnchors = false,
}: {
  authenticated?: boolean;
  rootAnchors?: boolean;
}) {
  const accountHref = authenticated ? '/app' : '/login';
  const accountLabel = authenticated ? 'Meu painel' : 'Entrar';

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Link href="/" aria-label="NUY Creators início" className={styles.lockup}>
          <span className={styles.lockupMark}>NUY</span>
          <span className={styles.lockupLabel}>CREATORS</span>
        </Link>

        <nav aria-label="Rodapé" className={styles.footerNav}>
          {landingFooterNavigation.map(([label, href]) => (
            <Link key={label} href={anchorFor(href, rootAnchors)} className={styles.navLink}>
              {label}
            </Link>
          ))}
          <Link href={accountHref} className={styles.navLink}>
            {accountLabel}
          </Link>
        </nav>
      </div>

      <div className={styles.footerBottom}>
        <p className={styles.footerCopy}>© 2026 NUY Creators</p>
        <nav aria-label="Legal" className={styles.footerLegal}>
          <Link href="/privacidade" className={styles.link}>
            Privacidade
          </Link>
          <Link href="/termos" className={styles.link}>
            Termos de uso
          </Link>
        </nav>
      </div>
    </footer>
  );
}
