import { Camera, Gift, ListChecks, UserRound, UserRoundPen } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 05 — Como participar (bloco navy).
 *
 * Cinco passos simples em colunas, cards quase sem decoração: número dourado,
 * ícone outline branco, título. No empilhado, swipe horizontal.
 *
 * POLISH 2: o ato abre com um fio dourado de 120px — um dos DOIS divisores da
 * landing inteira. Os cinco cards entram em cascata (01 primeiro, 05 por
 * último), cada um assentando de .985 com o fio passando de 40% para 100% e o
 * número dourado crescendo de .92 para 1.
 *
 * Não existe etapa "acesa": os cinco passos têm exatamente o mesmo peso depois
 * do reveal. A rodada 2 chegou a destacar o card mais próximo do centro da tela,
 * mas como os cinco ficam na MESMA linha, o destaque caía sempre no 03 — não
 * era progressão de leitura, era um card aceso por acidente. Melhor nenhum.
 */
const passos = [
  {
    numero: '01',
    icon: UserRound,
    title: 'Crie sua conta',
  },
  {
    numero: '02',
    icon: UserRoundPen,
    title: 'Complete seu perfil',
  },
  {
    numero: '03',
    icon: ListChecks,
    title: 'Participe dos desafios',
  },
  {
    numero: '04',
    icon: Camera,
    title: 'Compartilhe seu conteúdo',
  },
  {
    numero: '05',
    icon: Gift,
    title: 'Ganhe pontos e recompensas',
  },
] as const;

export function HowToParticipate() {
  return (
    <section id="como-participar" className={styles.howTo} aria-labelledby="pl-how-to-title">
      <span
        className={styles.divider}
        aria-hidden="true"
        data-pl-reveal="line"
        data-pl-index="0"
      />

      <h2 id="pl-how-to-title" className={styles.sectionTitle} data-pl-reveal data-pl-index="1">
        Como participar
      </h2>

      <p className={styles.howToSub} data-pl-reveal data-pl-index="2">
        É simples e rápido.
        <br />
        Comece agora sua jornada no NUY Creators.
      </p>

      {/* A régua que costura os passos é irmã da lista (dentro de um `<ol>` ela
          seria inválida) e cresce da esquerda para a direita no reveal, um
          degrau depois do último card. */}
      <div className={styles.progressRow}>
        <span
          className={styles.progressLine}
          aria-hidden="true"
          data-pl-reveal="line"
          data-pl-index="5"
        />
        <ol className={styles.steps}>
          {passos.map((passo, index) => (
            <li
              key={passo.numero}
              className={styles.stepCard}
              data-pl-reveal
              data-pl-index={String(index)}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {passo.numero}
              </span>
              <passo.icon
                size={28}
                strokeWidth={1.5}
                aria-hidden="true"
                className={styles.stepIcon}
              />
              <h3 className={styles.stepTitle}>{passo.title}</h3>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
