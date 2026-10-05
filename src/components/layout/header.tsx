'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import styles from './public-header.module.css';
import { publicNavigation, publicAccountLinks } from './public-navigation';
export function Header({
  editorial = false,
  authenticated = false,
}: {
  editorial?: boolean;
  authenticated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const navigation = publicNavigation;
  const accountLinks = publicAccountLinks(authenticated);
  return (
    <header className={`site-header ${styles.publicHeader} ${editorial ? styles.editorial : ''}`}>
      <Link href="/" aria-label="NUY Creators início" className="wordmark brand-lockup">
        {editorial ? (
          <>
            <Image
              src="/brand/reference/nuy-wordmark-hi.png"
              alt=""
              width={384}
              height={240}
              className="editorial-wordmark-image"
            />
            <span>CREATORS</span>
          </>
        ) : (
          <>
            nuy<span>CREATORS</span>
          </>
        )}
      </Link>
      <nav aria-label="Principal" className="desktop-nav">
        {navigation.map(([name, href]) => (
          <Link key={name} href={href}>
            {name}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        {accountLinks.map((link) =>
          link.primary ? (
            <Button key={link.href} asChild className="header-cta">
              <Link href={link.href}>
                {link.label}
                <ArrowUpRight size={15} />
              </Link>
            </Button>
          ) : (
            <Link key={link.href} href={link.href} className="login-link">
              {link.label}
            </Link>
          ),
        )}
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
          {navigation.map(([name, href]) => (
            <Link key={name} href={href} onClick={() => setOpen(false)}>
              {name}
            </Link>
          ))}
          {accountLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
