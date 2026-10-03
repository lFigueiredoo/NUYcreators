import Link from 'next/link';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="wordmark" href="/">
          nuy<span>CREATORS</span>
        </Link>
        <p>
          Pequenos momentos.
          <br />
          Novas possibilidades.
        </p>
        <nav aria-label="Rodapé">
          <Link href="/desafios">Desafios</Link>
          <Link href="/recompensas">Recompensas</Link>
          <Link href="/login">Minha conta</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} NUY Creators</span>
        <div>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </div>
        <span>Crie com presença.</span>
      </div>
    </footer>
  );
}
