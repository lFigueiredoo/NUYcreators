import type { CSSProperties } from 'react';
import { Camera, Gift, Sparkles } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 04 — O que é o NUY Creators (branco).
 *
 * Esquerda: headline + texto. Direita: três benefícios com ícone outline
 * simples — sem ilustração colorida, sem card carregado.
 *
 * POLISH 2: cada benefício entra de lado (o bloco inteiro mora à direita da
 * copy, então é ele que tem lado de onde vir) e, DENTRO dele, ícone, título e
 * descrição chegam em degraus de 55ms. O passo entre um item e o seguinte vem
 * de `--pl-delay` — declarado aqui no `<li>` e herdado pelos filhos, que é o
 * que dispensa qualquer máquina extra.
 */
const beneficios = [
  {
    icon: Camera,
    title: 'CRIE CONTEÚDO',
    text: 'Compartilhe sua rotina e experiências com NUY.',
  },
  {
    icon: Sparkles,
    title: 'GANHE RECONHECIMENTO',
    text: 'Participe dos desafios e evolua na comunidade.',
  },
  {
    icon: Gift,
    title: 'VIVA EXPERIÊNCIAS NUY',
    text: 'Tenha acesso a recompensas, novidades e ações especiais.',
  },
] as const;

export function WhatIs() {
  return (
    <section id="o-que-e" className={styles.whatIs} aria-labelledby="pl-what-is-title">
      <div className={styles.whatIsCopy}>
        <p className={styles.sectionLabel} data-pl-reveal data-pl-index="0">
          O QUE É NUY CREATORS
        </p>

        <h2
          id="pl-what-is-title"
          className={styles.sectionTitle}
          data-pl-reveal
          data-pl-index="1"
        >
          Muito mais que conteúdo.
          <br />É uma comunidade que inspira.
        </h2>

        <p className={styles.sectionBody} data-pl-reveal data-pl-index="2">
          O NUY Creators conecta pessoas que gostam de compartilhar rotinas, dicas e experiências
          para deixar a casa mais limpa, perfumada e acolhedora.
        </p>
      </div>

      <ul className={styles.benefitList}>
        {beneficios.map((beneficio, index) => (
          <li
            key={beneficio.title}
            className={styles.benefitItem}
            data-pl-reveal="side"
            data-pl-index="1"
            style={{ '--pl-delay': `${index * 90}ms` } as CSSProperties}
          >
            <beneficio.icon
              size={26}
              strokeWidth={1.6}
              aria-hidden="true"
              className={styles.benefitIcon}
              data-pl-reveal
              data-pl-index="2"
            />
            <div>
              <h3 className={styles.benefitTitle} data-pl-reveal data-pl-index="3">
                {beneficio.title}
              </h3>
              <p className={styles.benefitText} data-pl-reveal data-pl-index="4">
                {beneficio.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
