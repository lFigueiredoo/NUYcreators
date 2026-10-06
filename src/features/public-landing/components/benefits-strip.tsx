import type { CSSProperties } from 'react';
import { CalendarDays, Gift, HeartHandshake, NotebookPen } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 03 — Faixa de benefícios (Proposta C).
 * Quatro itens, ícones navy outline, separadores finos, fundo creme claro.
 */
const benefits = [
  [NotebookPen, 'Conteúdos exclusivos'],
  [CalendarDays, 'Desafios mensais'],
  [Gift, 'Recompensas reais'],
  [HeartHandshake, 'Uma comunidade acolhedora'],
] as const;

export function BenefitsStrip() {
  return (
    <section className={styles.benefits} aria-label="O que a comunidade oferece">
      <ul className={styles.benefitsList}>
        {benefits.map(([Icon, label], index) => (
          <li
            key={label}
            className={styles.benefitItem}
            data-pl-reveal
            style={{ '--pl-stagger': `${index * 70}ms` } as CSSProperties}
          >
            <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
