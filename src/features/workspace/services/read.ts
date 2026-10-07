import 'server-only';
import { Query } from 'node-appwrite';
import {
  countTableRows,
  databaseId,
  getTableRow,
  listTableRows,
  normalizeRow,
  sessionTables,
  type Tables,
} from '@/lib/appwrite/data';

/**
 * Leitura com a sessão da própria usuária.
 *
 * Três resultados são possíveis e a UI trata os três de formas diferentes:
 *  - `ok` com itens → dados reais;
 *  - `ok` vazio → não há nada ainda (empty state próprio de cada tela);
 *  - `unavailable` → não conseguimos olhar (permissão negada ou falha) e a tela
 *    mostra erro amigável com "Tentar novamente". Nunca é exibido como vazio:
 *    "não sabemos" e "não existe" são coisas diferentes.
 *
 * Nenhuma leitura aceita `userId` vindo do cliente: o escopo é sempre o da
 * sessão (`Query.equal('userId', viewer.id)`), e a linha é lida com o segredo do
 * cookie — a tabela não tem permissão própria, só a linha (`rowSecurity`).
 */
export type Loaded<T> = { state: 'ok'; items: T[] } | { state: 'unavailable' };

export function loaded<T>(items: T[]): Loaded<T> {
  return { state: 'ok', items };
}

export function unavailable<T>(): Loaded<T> {
  return { state: 'unavailable' };
}

/** Documentos por página na paginação interna. */
const PAGE = 100;
/** Teto de segurança por leitura (a página do Appwrite tem limite de 100). */
const ROOF = 500;

/**
 * Paginação em várias requisições exige ordenação estável (um índice), senão
 * páginas podem repetir ou pular documentos. Só ligamos `paged` quando a
 * consulta traz `orderBy`/`orderDesc` de um campo indexado; nas demais lemos
 * uma página só e ordenamos em memória, o que é suficiente na escala atual.
 */
export type ListOptions = {
  queries?: string[];
  limit?: number;
  paged?: boolean;
};

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function integer(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function optionalInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function flag(value: unknown): boolean {
  return value === true;
}

export type Document = Record<string, unknown>;

export function databases(secret: string): Tables {
  return sessionTables(secret);
}

/**
 * Log técnico no servidor. Só identificador de tabela e código do erro — nunca
 * conteúdo de linha, e-mail, handle ou qualquer dado pessoal.
 */
function report(scope: string, tableId: string, error: unknown) {
  const details = error as { code?: number; type?: string };
  const code = typeof details.code === 'number' ? details.code : 0;
  console.error(
    `[workspace:${scope}] falha ao ler ${tableId}`,
    JSON.stringify({ code, type: details.type ?? 'unknown' }),
  );
  return code;
}

/**
 * 404 em leitura de linha ou de tabela significa "nada aqui" — perfil que ainda
 * não existe, tabela que ainda não foi provisionada. É estado vazio, não erro.
 * 401/403 significam "não podemos olhar" e viram `unavailable`.
 */
function isAbsent(code: number) {
  return code === 404;
}

export async function listSession<T>(
  secret: string,
  scope: string,
  tableId: string,
  map: (row: Document) => T,
  options: ListOptions = {},
): Promise<Loaded<T>> {
  const roof = Math.min(options.limit ?? ROOF, ROOF);
  const base = options.queries ?? [];
  try {
    const tables = databases(secret);
    const items: T[] = [];
    const pages = options.paged ? Math.ceil(roof / PAGE) : 1;
    for (let page = 0; page < pages; page++) {
      const taken = page * PAGE;
      const result = await listTableRows(tables, {
        databaseId: databaseId(),
        tableId,
        queries: [
          ...base,
          Query.limit(Math.min(PAGE, roof - taken)),
          ...(page > 0 ? [Query.offset(taken)] : []),
        ],
      });
      items.push(...result.rows.map((row) => map(row as Document)));
      if (result.rows.length < PAGE) break;
    }
    return loaded(items);
  } catch (error) {
    const code = report(scope, tableId, error);
    return isAbsent(code) ? loaded<T>([]) : unavailable<T>();
  }
}

/** Linha única conhecida (`/{userId}` ou id próprio). Ausente é `ok` vazio. */
export async function getSessionDocument<T>(
  secret: string,
  scope: string,
  tableId: string,
  rowId: string,
  map: (row: Document) => T,
): Promise<Loaded<T>> {
  try {
    const row = await getTableRow(databases(secret), {
      databaseId: databaseId(),
      tableId,
      rowId,
    });
    return loaded([map(normalizeRow(row) as Document)]);
  } catch (error) {
    const code = report(scope, tableId, error);
    return isAbsent(code) ? loaded<T>([]) : unavailable<T>();
  }
}

/** Primeiro item de uma leitura — conveniência para documento único. */
export function first<T>(result: Loaded<T>): T | null {
  return result.state === 'ok' ? (result.items[0] ?? null) : null;
}

/**
 * Contagem exata (o `total` vem do Appwrite, não do tamanho da página).
 * Devolve `null` quando não foi possível contar — a UI omite o número em vez
 * de exibir um valor aproximado.
 */
export async function countSession(
  secret: string,
  scope: string,
  tableId: string,
  queries: string[] = [],
): Promise<number | null> {
  try {
    return await countTableRows(databases(secret), {
      databaseId: databaseId(),
      tableId,
      queries,
    });
  } catch (error) {
    const code = report(scope, tableId, error);
    return isAbsent(code) ? 0 : null;
  }
}
