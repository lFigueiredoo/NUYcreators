import { LoadingBlock, LoadingCards } from '@/features/workspace/components/ui/state';
import styles from '@/features/workspace/styles/app.module.css';

export default function AppLoading() {
  return (
    <div
      className={styles.routeLoading}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando painel"
    >
      <LoadingBlock lines={4} />
      <LoadingCards />
    </div>
  );
}
