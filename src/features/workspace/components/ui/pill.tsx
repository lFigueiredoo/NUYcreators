import type { LucideIcon } from 'lucide-react';
import type { StatusView, Tone } from '../../domain/status';
import styles from '../../styles/app.module.css';

const tones: Record<Tone, string> = {
  neutral: styles.toneNeutral,
  progress: styles.toneProgress,
  success: styles.toneSuccess,
  attention: styles.toneAttention,
  muted: styles.toneMuted,
};

/**
 * Estado real do domínio; o rótulo vem do mapa de status, nunca inventado.
 *
 * O ícone é opcional e decorativo (`aria-hidden`): quando existe, reforça a
 * categoria ao lado do rótulo — quem lê a tela continua ouvindo só o rótulo.
 */
export function Pill({ view, icon: Icon }: { view: StatusView; icon?: LucideIcon }) {
  return (
    <span className={`${styles.pill} ${tones[view.tone]}`}>
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      {view.label}
    </span>
  );
}
