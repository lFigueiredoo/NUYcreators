'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Floral } from './floral';
export function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.hero-copy > *', {
          y: 24,
          opacity: 0,
          duration: 1.1,
          stagger: 0.13,
          ease: 'power2.out',
        });
        gsap.to('.hero-product', {
          y: 45,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1.2 },
        });
        gsap.to('.floral-front', {
          y: -50,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1.5 },
        });
      }, root);
      const mouse = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || !root.current) return;
        const rect = root.current.getBoundingClientRect();
        gsap.to('.hero-orbit', {
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 16,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * 12,
          duration: 1.4,
          overwrite: 'auto',
        });
      };
      const element = root.current;
      element?.addEventListener('pointermove', mouse);
      return () => {
        element?.removeEventListener('pointermove', mouse);
        context.revert();
      };
    });
    return () => mm.revert();
  }, []);
  return (
    <section className="hero" ref={root}>
      <div className="hero-copy">
        <p className="eyebrow">
          <span /> Casa · bem-estar · criação
        </p>
        <h1>
          Crie.
          <br />
          <em>Compartilhe.</em>
          <br />
          Conquiste.
        </h1>
        <p className="hero-description">
          Uma comunidade para quem transforma rotina, casa e bem-estar em conteúdo que inspira.
        </p>
        <div className="hero-buttons">
          <Button asChild>
            <Link href="/cadastro">
              Fazer parte <ArrowUpRight size={17} />
            </Link>
          </Button>
          <Link href="#comunidade" className="subtle-link">
            Conheça a comunidade <ArrowDown size={15} />
          </Link>
        </div>
      </div>
      <div className="hero-art">
        <div className="hero-glow" />
        <div className="hero-orbit">
          <span className="orbit-line" />
          <span className="orbit-line orbit-two" />
          <Image
            className="hero-product"
            src="/brand/product-concept.webp"
            alt="Composição conceitual de produtos NUY com flores, recortada da referência visual fornecida"
            width={930}
            height={1011}
            priority
            sizes="(max-width: 760px) 90vw, 45vw"
          />
          <Floral className="floral-back" />
          <Floral className="floral-front" />
          <span className="light-dot light-one" />
          <span className="light-dot light-two" />
        </div>
        <p className="hero-art-note">Arte conceitual · direção visual NUY</p>
      </div>
      <div className="hero-bottom">
        <span>
          O seu jeito de viver.
          <br />
          <strong>O seu jeito de criar.</strong>
        </span>
        <a href="#comunidade" aria-label="Descobrir a comunidade">
          <ArrowDown size={19} />
        </a>
        <span className="hero-signature">
          Mais presença.
          <br />
          <em>Mais possibilidades.</em>
        </span>
      </div>
    </section>
  );
}
