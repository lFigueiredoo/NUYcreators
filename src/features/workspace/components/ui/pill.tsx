import type { StatusView, Tone } from '../../domain/status';
import styles from '../../styles/app.module.css';

const tones: Record<Tone, string> = {
  neutral: styles.toneNeutral,
  progress: styles.toneProgress,
  success: styles.toneSuccess,
  attention: styles.toneAttention,
  muted: styles.toneMuted,
};

/** Estado real do domínio; o rótulo vem do mapa de status, nunca inventado. */
export function Pill({ view }: { view: StatusView }) {
  return <span className={`${styles.pill} ${tones[view.tone]}`}>{view.label}</span>;
}
