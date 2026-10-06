'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import styles from '../../styles/app.module.css';

/**
 * "Tentar novamente" recarrega o servidor — nenhum dado é buscado no cliente.
 * A leitura continua sendo feita na sessão da própria usuária.
 */
export function RetryButton({ label = 'Tentar novamente' }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`${styles.button} ${styles.buttonGhost} ${pending ? styles.buttonDisabled : ''}`}
      aria-disabled={pending || undefined}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? 'Tentando…' : label}
    </button>
  );
}
