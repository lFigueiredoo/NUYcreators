'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
const links = [
  ['Comunidade', '/#comunidade'],
  ['Desafios', '/desafios'],
  ['Recompensas', '/recompensas'],
  ['Ranking', '/ranking'],
];
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link href="/" aria-label="NUY Creators início" className="wordmark">
        nuy<span>CREATORS</span>
      </Link>
      <nav aria-label="Principal" className="desktop-nav">
        {links.map(([name, href]) => (
          <Link key={name} href={href}>
            {name}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/login" className="login-link">
          Entrar
        </Link>
        <Button asChild className="header-cta">
          <Link href="/cadastro">
            Fazer parte <ArrowUpRight size={15} />
          </Link>
        </Button>
        <button
          className="menu-button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Principal móvel" className="mobile-nav">
          {links.map(([name, href]) => (
            <Link key={name} href={href} onClick={() => setOpen(false)}>
              {name}
            </Link>
          ))}
          <Link href="/login">Entrar</Link>
          <Link href="/cadastro">Fazer parte</Link>
        </nav>
      )}
    </header>
  );
}
