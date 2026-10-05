import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="wordmark" href="/">
          <Image
            src="/brand/reference/nuy-wordmark-hi.png"
            alt="NUY"
            width={384}
            height={240}
            className="editorial-wordmark-image"
          />
          <span>CREATORS</span>
        </Link>
        <p>
          Pequenos momentos.
          <br />
          Novas possibilidades.
        </p>
        <nav aria-label="Rodapé">
          <Link href="/#projeto">O projeto</Link>
          <Link href="/#beneficios">Benefícios</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/login">Entrar</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} NUY Creators</span>
        <div>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </div>
        <p className="footer-signature">Crie com presença.</p>
      </div>
    </footer>
  );
}
