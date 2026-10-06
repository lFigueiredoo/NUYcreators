import Link from 'next/link';
import { ArrowRight, Home, MessageCircle, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import styles from '../styles/landing.module.css';

/**
 * 08 — Conteúdos (Proposta C).
 *
 * Terceiro bloco claro da página, entre as recompensas e a FAQ. O visitante
 * está deslogado e NÃO existe acervo publicado: a seção apresenta os tipos de
 * conteúdo que a comunidade produz, em três colunas tipográficas — sem card de
 * post, sem foto de creator, sem contagem. A nota do rodapé diz exatamente
 * isso, para a coluna não prometer acervo que ainda não há.
 */
const pilares = [
  {
    Icone: Home,
    titulo: 'Rotinas de casa',
    texto: 'O que funciona no dia a dia de quem vive a casa, sem produção e sem roteiro.',
  },
  {
    Icone: Sparkles,
    titulo: 'Antes e depois',
    texto: 'Transformações de ambiente contadas no ritmo real da rotina.',
  },
  {
    Icone: MessageCircle,
    titulo: 'Impressões honestas',
    texto: 'O que a comunidade sentiu ao usar os produtos da linha NUY.',
  },
] as const;

export function Conteudos() {
  return (
    <section id="conteudos" className={styles.contents} aria-labelledby="pl-contents-title">
      <div className={styles.contentsHead}>
        <p className={styles.sectionEyebrow} data-pl-reveal>
          CONTEÚDOS
        </p>

        <h2 id="pl-contents-title" className={styles.sectionTitle} data-pl-reveal>
          Conteúdos que nascem <em>da rotina real.</em>
        </h2>

        <p className={styles.sectionBody} data-pl-reveal>
          Cada creator traz o seu olhar: o que testou, o que mudou a rotina e o que vale dividir.
        </p>

        <div className={styles.contentsActions} data-pl-reveal>
          <Link href="/cadastro" className={styles.primaryButton}>
            Fazer parte da comunidade
            <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
          </Link>
        </div>
      </div>

      <ul className={styles.contentsGrid}>
        {pilares.map(({ Icone, titulo, texto }, indice) => (
          <li
            key={titulo}
            className={styles.contentItem}
            data-pl-reveal
            style={{ '--pl-stagger': `${indice * 80}ms` } as CSSProperties}
          >
            <span className={styles.contentIcon} aria-hidden="true">
              <Icone size={19} strokeWidth={1.5} />
            </span>
            <h3 className={styles.contentTitle}>{titulo}</h3>
            <p className={styles.contentText}>{texto}</p>
          </li>
        ))}
      </ul>

      <p className={styles.contentsNote} data-pl-reveal>
        Os primeiros conteúdos chegam com os creators da comunidade.
      </p>
    </section>
  );
}
