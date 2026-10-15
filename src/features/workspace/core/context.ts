import type { Tables, Transactions } from '../../../lib/appwrite/data/contract';
import { roleAllows, type AdminRole } from '../../../lib/security/permissions';

/**
 * Núcleo operacional do NUY Creators.
 *
 * Este diretório é o único lugar que decide COMO uma operação de negócio grava
 * (transação, chave de idempotência, auditoria, outbox). Ele não lê ambiente,
 * não constrói cliente e não conhece cookie: quem chama injeta o `TablesDB` já
 * autenticado e a identidade já verificada. É o que permite o mesmo código rodar
 * em dois hospedeiros — server actions do Next (sessão da usuária, chave de
 * operações) e Appwrite Functions (`x-appwrite-key` do runtime) — sem duplicar
 * regra financeira.
 *
 * Nada aqui importa `server-only`: as Functions empacotam este módulo com
 * esbuild e o marcador do Next lançaria ao importar.
 */
export type CoreTables = Tables & Transactions;

export type CoreActor = {
  /** Identidade verificada da sessão. Nunca vem do payload do cliente. */
  userId: string;
  /** Papéis apurados de membership de equipe confirmada (nunca de campo do cliente). */
  roles: readonly AdminRole[];
};

export type CoreContext = {
  tables: CoreTables;
  databaseId: string;
  actor: CoreActor;
  /** Instante do comando — injetado para que janela de desafio e período de ranking sejam testáveis. */
  now: Date;
  /** Correlação da requisição; vai para `audit_logs.correlationId`. Nunca é identidade. */
  correlationId: string;
  /** Set by the trusted host only after the additive Academy tables are active. */
  academyCommentsReady?: boolean;
  /** Set only after the existing challenge-comment ACL migration is verified. */
  challengeCommentsPrivateReady?: boolean;
};

/** Códigos de recusa com significado de negócio — a UI traduz, o core não escreve copy. */
export type CoreCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'unavailable'
  | 'conflict'
  | 'window_closed'
  | 'not_published'
  | 'level_required'
  | 'capacity_full'
  | 'not_participant'
  | 'duplicate_content'
  | 'insufficient_points'
  | 'out_of_stock'
  | 'limit_reached'
  | 'price_changed';

const STATUS: Record<CoreCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  unavailable: 503,
  conflict: 409,
  window_closed: 409,
  not_published: 409,
  level_required: 403,
  capacity_full: 409,
  not_participant: 403,
  duplicate_content: 409,
  insufficient_points: 409,
  out_of_stock: 409,
  limit_reached: 409,
  price_changed: 409,
};

export type CoreFailure = {
  code: CoreCode;
  status: number;
  /** Só para falha de plataforma: repetir a mesma intenção pode funcionar. */
  retryable?: boolean;
};

export type CoreResult<T> = { ok: true; value: T } | { ok: false; failure: CoreFailure };

export function failure(code: CoreCode, retryable = false): { ok: false; failure: CoreFailure } {
  return { ok: false, failure: { code, status: STATUS[code], retryable } };
}

export function done<T>(value: T): CoreResult<T> {
  return { ok: true, value };
}

/** Papel administrativo apurado — moderador não ajusta pontos, fulfillment não modera. */
export function allows(ctx: CoreContext, capability: string): boolean {
  return ctx.actor.roles.some((role) => roleAllows(role, capability));
}

export function requiresStaff<T>(ctx: CoreContext, capability: string): CoreResult<T> | null {
  if (!ctx.actor.userId) return failure('unauthenticated');
  if (!allows(ctx, capability)) return failure('forbidden');
  return null;
}
