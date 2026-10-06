import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Gift, Trophy, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import styles from '../styles/landing.module.css';

/**
 * 06 — Comunidade / manifesto (Proposta C).
 *
 * O segundo bloco navy da página, e o mais editorial: copy na régua à esquerda,
 * fotografia de casa real à direita. A copy é verbatim do brief — nenhum número
 * de creators, desafio ou recompensa aparece (não existe backend que os prove).
 *
 * A linha de quatro marcas é um índice do que a comunidade reúne, não uma
 * segunda faixa de benefícios: ícone outline em dourado e rótulo em creme,
 * sem card e sem moldura.
 */
const marcas = [
  { Icone: Users, rotulo: 'Creators' },
  { Icone: Trophy, rotulo: 'Desafios' },
  { Icone: Gift, rotulo: 'Recompensas' },
  { Icone: BookOpen, rotulo: 'Conteúdos' },
] as const;

export function Community() {
  return (
    <section id="manifesto" className={styles.community} aria-labelledby="pl-community-title">
      <div className={styles.communityCopy}>
        <p className={styles.communityEyebrow} data-pl-reveal>
          COMUNIDADE NUY
        </p>

        <h2 id="pl-community-title" className={styles.communityTitle} data-pl-reveal>
          Mais que limpeza,
          <br />
          <em>uma casa que acolhe.</em>
        </h2>

        <p className={styles.communityBody} data-pl-reveal>
          Conteúdos, desafios, experiências e pessoas reais que tornam a rotina mais leve, bonita e
          significativa.
        </p>

        <div className={styles.communityActions} data-pl-reveal>
          <Link href="/cadastro" className={styles.communityCta}>
            Fazer parte da comunidade
            <ArrowRight size={17} aria-hidden="true" className={styles.buttonArrow} />
          </Link>
        </div>

        <ul className={styles.communityMarks}>
          {marcas.map(({ Icone, rotulo }, indice) => (
            <li
              key={rotulo}
              className={styles.communityMark}
              data-pl-reveal
              style={{ '--pl-stagger': `${indice * 70}ms` } as CSSProperties}
            >
              <Icone size={17} strokeWidth={1.5} aria-hidden="true" />
              <span>{rotulo}</span>
            </li>
          ))}
        </ul>
      </div>

      <figure className={styles.communityMedia} data-pl-reveal>
        <Image
          src="/brand/nuy-creators-v2/home/cozy-home.webp"
          alt="Sala iluminada pelo sol com sofá, manta de tricô e a linha NUY sobre a mesa de mármore"
          width={1672}
          height={941}
          quality={88}
          sizes="(max-width: 899px) 100vw, min(60vw, 954px)"
          className={styles.communityImage}
          loading="lazy"
        />
      </figure>
    </section>
  );
}
