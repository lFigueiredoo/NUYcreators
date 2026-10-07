import {
  commitTransaction,
  isConflict,
  rollbackTransaction,
  type Refusal,
} from '../../../lib/appwrite/data/contract';
import { failure, type CoreCode, type CoreContext, type CoreResult } from './context';
import type { Staged } from './record';

/**
 * Uma operação de negócio = uma transação, sempre pelo mesmo caminho.
 *
 * Medido no staging (não presumido): a unicidade de coluna é cobrada no COMMIT
 * e volta **409 `transaction_conflict`**; escrita limitada que perde a corrida
 * volta **400 `attribute_limit_exceeded`**. Os dois são recusa de negócio, não
 * falha de plataforma — quem chama diz o que eles significam na sua operação.
 *
 * O que este invólucro garante:
 *  - nada é commitado se o corpo devolveu falha;
 *  - falha de plataforma vira `unavailable` retentável, nunca um sucesso torto;
 *  - a transação é sempre descartada no fim — uma transação esquecida segura
 *    escrita nas tabelas até o TTL.
 */
export async function inTransaction<T>(
  ctx: CoreContext,
  run: (tx: Staged) => Promise<CoreResult<T>>,
  codes: { conflict?: CoreCode; bound?: CoreCode } = {},
): Promise<CoreResult<T>> {
  let transactionId: string;
  try {
    transactionId = (await ctx.tables.createTransaction({ ttl: 120 })).$id;
  } catch {
    return failure('unavailable', true);
  }
  const tx: Staged = { transactionId };
  let settled = false;
  try {
    const result = await run(tx);
    if (!result.ok) return result;
    try {
      await commitTransaction(ctx.tables, transactionId);
      settled = true;
    } catch (error) {
      const refusal = error as Refusal & { code?: number };
      if (isConflict(error)) return failure(codes.conflict ?? 'conflict');
      // Só a recusa MEDIDA de escrita limitada é recusa de negócio: qualquer
      // outro 400 no commit é anomalia e sobe, em vez de virar "conflito".
      if (refusal.code === 400 && refusal.type === 'attribute_limit_exceeded')
        return failure(codes.bound ?? 'conflict');
      if (typeof refusal.code === 'number') return failure('unavailable', true);
      throw error;
    }
    return result;
  } catch (error) {
    // Recusa da plataforma vira indisponibilidade retentável, sem mensagem
    // (pode carregar detalhe de conta). Erro que NÃO é da plataforma é defeito
    // NOSSO e sobe: um id fora do limite de 36 caracteres ficou escondido atrás
    // de um 503 até uma sonda mostrar a causa — defeito não se disfarça de
    // "tente de novo em instantes".
    if (typeof (error as { code?: unknown }).code === 'number') return failure('unavailable', true);
    throw error;
  } finally {
    if (!settled) await rollbackTransaction(ctx.tables, transactionId).catch(() => undefined);
    // `deleteTransaction` lança de forma SÍNCRONA quando o parâmetro falta, e
    // `.catch()` não pega exceção síncrona: ela subia pelo `finally` e trocava
    // um resultado já decidido por um 500 sem causa (medido nesta rodada, no
    // container). Descartar a transação é higiene — o TTL resolve se falhar.
    try {
      if (transactionId) await ctx.tables.deleteTransaction({ transactionId });
    } catch {
      // Transação expirada, já descartada ou id ausente: nada a fazer aqui.
    }
  }
}
