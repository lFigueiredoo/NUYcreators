import styles from '../../styles/app.module.css';

/**
 * Barra de progresso acessível. O texto lido por leitor de tela é o rótulo
 * completo (`aria-valuetext`), não só o percentual.
 */
export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));
  return (
    <div
      className={styles.progressTrack}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max > 0 ? max : undefined}
      aria-valuenow={value}
      aria-valuetext={label}
    >
      <div className={styles.progressBar} style={{ width: `${percent}%` }} />
    </div>
  );
}
