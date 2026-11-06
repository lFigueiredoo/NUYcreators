import { LoadingBlock } from '@/features/workspace/components/ui/state';
import styles from '@/features/workspace/styles/app.module.css';

export default function AdminLoading() {
  return (
    <div
      className={styles.routeLoading}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando administração"
    >
      <LoadingBlock lines={6} />
    </div>
  );
}
