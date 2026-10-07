import { createHash } from 'node:crypto';
import { Query, TablesDB } from 'node-appwrite';

/**
 * Contrato de persistência — a parte PURA do adaptador.
 *
 * Existe separado do resto de `src/lib/appwrite/data` porque este arquivo é
 * consumido também pelo core operacional, que roda em dois hospedeiros: o
 * servidor Next (server actions, marcador `server-only`) e as Appwrite Functions
 * (bundle esbuild, onde `server-only` lançaria ao importar). Nada aqui lê
 * `process.env` nem constrói cliente: o cliente entra sempre por parâmetro, e
 * por isso este módulo não pode vazar credencial nenhuma.
 *
 * As garantias de linha são as mesmas do adaptador: `$id`/`$tableId` normalizado
 * e erro de API intacto para quem chamou decidir o significado.
 */
export type Row = Record<string, unknown>;
export type Tables = Pick<
  TablesDB,
  'listRows' | 'getRow' | 'createRow' | 'updateRow' | 'deleteRow'
>;

/**
 * O TablesDB devolve `$tableId`. Se algum objeto legado chegar com
 * `$collectionId` (nome antigo), o adaptador normaliza — o contrato do domínio
 * não muda e nenhuma tela precisa saber qual API respondeu.
 */
export function normalizeRow<RowShape extends Row>(
  row: RowShape,
): RowShape & { $tableId?: string } {
  const legacy = row as { $collectionId?: unknown; $tableId?: unknown };
  if (!legacy.$tableId && typeof legacy.$collectionId === 'string')
    return { ...row, $tableId: legacy.$collectionId };
  return row as RowShape & { $tableId?: string };
}

export async function listTableRows(
  tables: Tables,
  params: {
    databaseId: string;
    tableId: string;
    queries?: string[];
    transactionId?: string;
  },
): Promise<{ rows: Row[]; total: number }> {
  const result = await tables.listRows(params);
  return {
    rows: result.rows.map((row) => normalizeRow(row as Row)),
    total: typeof result.total === 'number' ? result.total : 0,
  };
}

/** Contagem exata sem trazer conteúdo: a página é mínima, o `total` é do banco. */
export async function countTableRows(
  tables: Tables,
  params: { databaseId: string; tableId: string; queries?: string[]; transactionId?: string },
): Promise<number> {
  const result = await tables.listRows({
    ...params,
    queries: [...(params.queries ?? []), Query.limit(1)],
  });
  return typeof result.total === 'number' ? result.total : 0;
}

export async function getTableRow(
  tables: Tables,
  params: { databaseId: string; tableId: string; rowId: string; transactionId?: string },
): Promise<Row> {
  return normalizeRow((await tables.getRow(params)) as Row);
}

/**
 * O único mapeamento não 1:1 da migração para TablesDB.
 *
 * `audit_logs` pedia `beforeJson` + `afterJson`, e o TablesDB limita a soma de
 * varchar por tabela (medido: 16.108 bytes aceitos, a coluna seguinte volta
 * `400 column_limit_exceeded`). Os dois snapshots passaram a viver em
 * `audit_log_snapshots`, uma linha por lado. O domínio continua enxergando
 * `beforeJson`/`afterJson` no log: a composição e a separação acontecem aqui —
 * e nenhuma informação é perdida no caminho.
 */
export const AUDIT_SNAPSHOTS_TABLE = 'audit_log_snapshots';
export const SNAPSHOT_SIDES = ['before', 'after'] as const;
export type SnapshotSide = (typeof SNAPSHOT_SIDES)[number];

/**
 * Id do snapshot, derivado do log — mas com o TETO de 36 caracteres que a
 * plataforma cobra (medido: `Invalid rowId param: at most 36 chars`). Concatenar
 * `id-side` estourava o limite e derrubava toda auditoria; o id é um digest, do
 * mesmo tamanho dos demais, e continua determinístico e único por lado.
 */
export function snapshotRowId(auditLogId: string, side: SnapshotSide): string {
  return createHash('sha256').update(`${auditLogId}:${side}`).digest('hex').slice(0, 36);
}

/** Separa o log em (linha da tabela `audit_logs`, linhas de snapshot). */
export function splitAuditLog(
  entry: Row & { $id?: string; beforeJson?: unknown; afterJson?: unknown },
): { log: Row; snapshots: Row[] } {
  const { beforeJson, afterJson, ...log } = entry;
  const auditLogId = typeof log.$id === 'string' ? log.$id : '';
  const snapshots = [
    { side: 'before' as const, payloadJson: beforeJson },
    { side: 'after' as const, payloadJson: afterJson },
  ]
    .filter((snapshot) => snapshot.payloadJson !== undefined && snapshot.payloadJson !== null)
    .map((snapshot) => ({
      $id: snapshotRowId(auditLogId, snapshot.side),
      auditLogId,
      side: snapshot.side,
      payloadJson: JSON.stringify(snapshot.payloadJson),
    }));
  return { log, snapshots };
}

/**
 * Recomposição: snapshots ausentes (log sem alteração de estado, ou limpeza já
 * ocorrida) devolvem `null` — nunca um objeto vazio fingindo conteúdo.
 */
export function composeAuditLog(
  log: Row,
  snapshots: Row[],
): Row & {
  beforeJson: unknown;
  afterJson: unknown;
} {
  const auditLogId = typeof log.$id === 'string' ? log.$id : '';
  const of = (side: SnapshotSide) => {
    const found = snapshots.find((row) => row.auditLogId === auditLogId && row.side === side);
    if (!found || typeof found.payloadJson !== 'string') return null;
    try {
      return JSON.parse(found.payloadJson) as unknown;
    } catch {
      return null;
    }
  };
  return { ...log, beforeJson: of('before'), afterJson: of('after') };
}

export async function createTableRow(
  tables: Tables,
  params: {
    databaseId: string;
    tableId: string;
    rowId: string;
    data: Record<string, unknown>;
    permissions?: string[];
    transactionId?: string;
  },
): Promise<Row> {
  return normalizeRow((await tables.createRow(params)) as Row);
}

export async function updateTableRow(
  tables: Tables,
  params: {
    databaseId: string;
    tableId: string;
    rowId: string;
    data?: Record<string, unknown>;
    permissions?: string[];
    transactionId?: string;
  },
): Promise<Row> {
  return normalizeRow((await tables.updateRow(params)) as Row);
}

/**
 * Transações do TablesDB — o que o NUY Creators exige para crédito de pontos,
 * resgate e baixa de estoque.
 *
 * Comportamento medido no staging (não presumido):
 *  - operação estagiada não é visível fora da transação (leitura devolve 404);
 *  - `commit` pode ser recusado com **409 `transaction_conflict`** — inclusive
 *    quando a unicidade de uma coluna só é violada no commit (dois casos com o
 *    mesmo valor único estagiado/commitado);
 *  - `rollback` devolve 200 e a transação termina com `status: failed`;
 *  - escrita limitada (`decrementRowColumn` com `min`) é atômica: em corrida,
 *    exatamente um commit passa e o perdedor volta **400
 *    `attribute_limit_exceeded`** (o limite é conferido no commit, não no stage).
 */
export type Transactions = Pick<
  TablesDB,
  | 'createTransaction'
  | 'updateTransaction'
  | 'deleteTransaction'
  | 'getTransaction'
  | 'incrementRowColumn'
  | 'decrementRowColumn'
>;

/** Recusa medida: status HTTP, código do `AppwriteException` e mensagem. */
export type Refusal = { status: number; code: number; type: string; message: string };

export const CONFLICT = 409;
export const BOUND_VIOLATED = 400;

export function sanitize(message: string, secrets: readonly (string | undefined)[] = []): string {
  return secrets
    .filter((secret): secret is string => typeof secret === 'string' && secret.length > 0)
    .reduce((text, secret) => text.split(secret).join('[redacted]'), message);
}

export function refusal(error: unknown, secrets: readonly (string | undefined)[] = []): Refusal {
  const failure = error as { code?: number; type?: string; message?: string };
  return {
    status: failure.code ?? -1,
    code: failure.code ?? -1,
    type: failure.type ?? '',
    message: sanitize(failure.message ?? '', secrets),
  };
}

export function isConflict(error: unknown): boolean {
  return (error as { code?: number }).code === CONFLICT;
}

export function isAbsent(error: unknown): boolean {
  return (error as { code?: number }).code === 404;
}

/** Uma transação por operação de negócio; TTL curto o bastante para não travar o banco. */
export const TRANSACTION_TTL_SECONDS = 120;

export async function openTransaction(
  tables: Transactions,
  ttl = TRANSACTION_TTL_SECONDS,
): Promise<string> {
  const created = await tables.createTransaction({ ttl });
  return created.$id;
}

export async function commitTransaction(
  tables: Transactions,
  transactionId: string,
): Promise<void> {
  await tables.updateTransaction({ transactionId, commit: true });
}

export async function rollbackTransaction(
  tables: Transactions,
  transactionId: string,
): Promise<void> {
  await tables.updateTransaction({ transactionId, rollback: true });
}

/**
 * Descarta a transação (estagiada ou já resolvida). Chamado em `finally`: uma
 * transação esquecida continua viva até o TTL e segura escrita nas tabelas.
 */
export async function discardTransaction(
  tables: Transactions,
  transactionId: string,
): Promise<void> {
  await tables.deleteTransaction({ transactionId });
}

/**
 * Débito limitado. `min` é conferido pelo banco no commit: se a corrida perder,
 * a coluna não fica negativa e o erro é uma recusa medida, não um valor torto.
 */
export async function decrementColumn(
  tables: Transactions,
  params: {
    databaseId: string;
    tableId: string;
    rowId: string;
    column: string;
    value: number;
    min?: number;
    transactionId?: string;
  },
): Promise<void> {
  await tables.decrementRowColumn(params);
}

export async function incrementColumn(
  tables: Transactions,
  params: {
    databaseId: string;
    tableId: string;
    rowId: string;
    column: string;
    value: number;
    max?: number;
    transactionId?: string;
  },
): Promise<void> {
  await tables.incrementRowColumn(params);
}
