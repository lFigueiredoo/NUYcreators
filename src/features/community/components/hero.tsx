import Link from 'next/link';
import { ArrowRight, Users, NotebookPen, CalendarDays, Gift } from 'lucide-react';
import { Scene } from './scene';
import styles from './landing.module.css';
import { Header } from '@/components/layout/header';
import art from './hero-artboard.module.css';
import { heroEditorial } from './landing-fonts';
import { HeroMotion } from './hero-motion';
import motion from './hero-motion.module.css';

export function Hero({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <section
      className={`${styles.hero} ${art.shell} ${heroEditorial.variable} ${motion.root}`}
      aria-label="NUY Creators"
      data-visual-hero
      data-static-artboard
    >
      <HeroMotion />
      <div className={art.artboard} data-hero-artboard>
        <Scene />
        <Header editorial authenticated={authenticated} />
        <div className={`${styles.heroCopy} ${art.copy}`}>
          <p className={styles.kicker} data-hero-reveal>
            ROTINA · BEM-ESTAR · PERFUME · CRIAÇÃO
          </p>
          <h1 data-hero-reveal data-hero-headline>
            <span>Bem-vinda ao</span>
            <br />
            <strong>NUY CREATORS</strong>
          </h1>
          <p className={styles.heroDescription} data-hero-reveal>
            {/* Quebras da referência (desktop); em faixas responsivas as <br/>
                podem ser escondidas via CSS — o espaço explícito evita a colagem
                "transformarrotina" quando o CSS oculta a quebra. */}
            Uma comunidade real para quem transforma <br />
            rotina, casa e bem-estar em conteúdo <br />
            que inspira.
          </p>
          <div className={styles.actions} data-hero-reveal data-hero-actions>
            <Link href="/cadastro" className={styles.primaryButton}>
              Fazer parte agora <ArrowRight size={17} />
            </Link>
            <Link href="/login" className={styles.outlineButton}>
              Entrar
            </Link>
          </div>
        </div>
        <div className={styles.heroFoot} data-hero-benefits>
          <span>
            <Users size={18} />
            Comunidade NUY
          </span>
          <span>
            <NotebookPen size={18} />
            Conteúdos exclusivos
          </span>
          <span>
            <CalendarDays size={18} />
            Desafios mensais
          </span>
          <span>
            <Gift size={18} />
            Pontos e recompensas
          </span>
        </div>
      </div>
    </section>
  );
}
