import type { ReactNode } from 'react';
import Link from 'next/link';
import { Pill } from '@/features/workspace/components/ui/pill';
import { UnavailableState } from '@/features/workspace/components/ui/state';
import { catalogView } from '@/features/workspace/domain/catalog';
import type { AdminOutcome } from '../services/console';
import styles from '../styles/admin.module.css';

/**
 * Peças comuns das telas administrativas.
 *
 * `UnavailableState` é o do produto, e continua sendo o mesmo componente: falha
 * de leitura na administração é a mesma falha de leitura da área da creator, e
 * não existe uma segunda linguagem para dizer "não conseguimos carregar".
 */

/** Indicador com número exato. Zero aparece como zero — é resposta, não vazio. */
export function Kpi({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      {hint ? (
        <p className={`${styles.kpiHint} ${value === 0 ? styles.kpiHintZero : ''}`}>{hint}</p>
      ) : null}
    </>
  );
  if (href)
    return (
      <Link href={href} className={styles.kpi} style={{ textDecoration: 'none' }}>
        {body}
      </Link>
    );
  return <div className={styles.kpi}>{body}</div>;
}

/** Estado do catálogo com o rótulo do domínio. Palavra desconhecida sai crua. */
export function StatusPill({ status }: { status: string }) {
  return <Pill view={catalogView(status)} />;
}

/** Envelope das leituras: o valor, ou o aviso de que a leitura falhou. */
export function Outcome<T>({
  result,
  what,
  children,
}: {
  result: AdminOutcome<T>;
  what: string;
  children: (value: T) => ReactNode;
}) {
  if (!result.ok) return <UnavailableState what={what} detail={result.message} />;
  return <>{children(result.value)}</>;
}

/** Moldura de tabela: rolagem própria no mobile, cabeçalho com o mesmo peso. */
export function Table({
  caption,
  head,
  children,
}: {
  /** Descrição para leitor de tela — a tabela não tem título visível. */
  caption: string;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srCaption}>{caption}</caption>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Linha vazia: diz o que não existe ainda, sem inventar dado. */
export function EmptyRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className={styles.tableMuted}>
        {children}
      </td>
    </tr>
  );
}
