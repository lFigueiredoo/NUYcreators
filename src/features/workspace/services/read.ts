import 'server-only';
import { Databases, Query } from 'node-appwrite';
import { sessionClient } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';

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
 * sessão (`Query.equal('userId', viewer.id)`), e o documento é lido com o
 * segredo do cookie — a coleção não tem permissão de coleção, só de documento.
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

export function databases(secret: string) {
  return new Databases(sessionClient(secret));
}

function databaseId() {
  return getEnvironment().APPWRITE_DATABASE_ID;
}

/**
 * Log técnico no servidor. Só identificadores de coleção e código do erro —
 * nunca conteúdo de documento, e-mail, handle ou qualquer dado pessoal.
 */
function report(scope: string, collectionId: string, error: unknown) {
  const details = error as { code?: number; type?: string };
  const code = typeof details.code === 'number' ? details.code : 0;
  console.error(
    `[workspace:${scope}] falha ao ler ${collectionId}`,
    JSON.stringify({ code, type: details.type ?? 'unknown' }),
  );
  return code;
}

/**
 * 404 em leitura de documento ou de coleção significa "nada aqui" — perfil que
 * ainda não existe, coleção que ainda não foi provisionada. É estado vazio,
 * não erro. 401/403 significam "não podemos olhar" e viram `unavailable`.
 */
function isAbsent(code: number) {
  return code === 404;
}

export async function listSession<T>(
  secret: string,
  scope: string,
  collectionId: string,
  map: (document: Document) => T,
  options: ListOptions = {},
): Promise<Loaded<T>> {
  const roof = Math.min(options.limit ?? ROOF, ROOF);
  const base = options.queries ?? [];
  try {
    const db = databases(secret);
    const items: T[] = [];
    const pages = options.paged ? Math.ceil(roof / PAGE) : 1;
    for (let page = 0; page < pages; page++) {
      const taken = page * PAGE;
      const result = await db.listDocuments({
        databaseId: databaseId(),
        collectionId,
        queries: [
          ...base,
          Query.limit(Math.min(PAGE, roof - taken)),
          ...(page > 0 ? [Query.offset(taken)] : []),
        ],
      });
      items.push(...result.documents.map((document) => map(document as Document)));
      if (result.documents.length < PAGE) break;
    }
    return loaded(items);
  } catch (error) {
    const code = report(scope, collectionId, error);
    return isAbsent(code) ? loaded<T>([]) : unavailable<T>();
  }
}

/** Documento único conhecido (`/{userId}` ou id próprio). Ausente é `ok` vazio. */
export async function getSessionDocument<T>(
  secret: string,
  scope: string,
  collectionId: string,
  documentId: string,
  map: (document: Document) => T,
): Promise<Loaded<T>> {
  try {
    const document = await databases(secret).getDocument({
      databaseId: databaseId(),
      collectionId,
      documentId,
    });
    return loaded([map(document as Document)]);
  } catch (error) {
    const code = report(scope, collectionId, error);
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
  collectionId: string,
  queries: string[] = [],
): Promise<number | null> {
  try {
    const result = await databases(secret).listDocuments({
      databaseId: databaseId(),
      collectionId,
      queries: [...queries, Query.limit(1)],
    });
    return typeof result.total === 'number' ? result.total : null;
  } catch (error) {
    const code = report(scope, collectionId, error);
    return isAbsent(code) ? 0 : null;
  }
}
