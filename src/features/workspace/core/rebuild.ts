import { Query } from 'node-appwrite';
import { createTableRow, listTableRows, updateTableRow } from '../../../lib/appwrite/data/contract';
import { Permission, Role } from 'node-appwrite';
import { done, requiresStaff, type CoreContext, type CoreResult } from './context';
import { periodKey, rowId } from './ids';
import { rankingTimeZone } from '../domain/ranking';

/**
 * Reconstrução da projeção de ranking a partir do ledger.
 *
 * O ranking é projeção: quem manda é `point_transactions.rankingDelta`. Este job
 * soma o delta elegível por (período, usuária) e reescreve `ranking_entries`
 * com o valor absoluto — é o caminho de reparo quando a projeção divergir, e a
 * conferência de que ela não divergiu.
 *
 * O período é calculado no fuso do ciclo (`America/Sao_Paulo`), não em UTC: um
 * crédito às 22h de 31 de janeiro em São Paulo é de janeiro, mesmo já sendo
 * fevereiro em UTC. Débito de resgate entra com `rankingDelta` zero e por isso
 * não aparece aqui — gastar pontos não muda conquista (docs/database.md).
 *
 * Sem período informado, reconstrói TODOS os períodos presentes no ledger.
 */
export type RebuildResult = {
  periods: { periodKey: string; entries: number; earnedPoints: number }[];
  scanned: number;
  /** `true` quando o teto de leitura foi atingido — o job é reprocessável. */
  truncated: boolean;
};

/** Teto de leitura por execução (o job é idempotente: rodar de novo continua). */
const ROOF = 2000;

export async function rebuildRanking(
  ctx: CoreContext,
  input: { period?: string } = {},
): Promise<CoreResult<RebuildResult>> {
  const blocked = requiresStaff<RebuildResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;

  const totals = new Map<string, Map<string, { points: number; last: string }>>();
  let scanned = 0;
  let truncated = false;
  for (let offset = 0; offset < ROOF; offset += 100) {
    const page = await listTableRows(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'point_transactions',
      queries: [
        Query.orderAsc('createdAt'),
        Query.limit(100),
        ...(offset > 0 ? [Query.offset(offset)] : []),
      ],
    });
    for (const row of page.rows) {
      scanned += 1;
      const delta = typeof row.rankingDelta === 'number' ? row.rankingDelta : 0;
      if (delta <= 0) continue;
      const createdAt = typeof row.createdAt === 'string' ? new Date(row.createdAt) : null;
      const userId = typeof row.userId === 'string' ? row.userId : '';
      if (!createdAt || Number.isNaN(createdAt.getTime()) || !userId) continue;
      const key = periodKey(createdAt, rankingTimeZone);
      if (input.period && key !== input.period) continue;
      const perUser = totals.get(key) ?? new Map();
      const current = perUser.get(userId) ?? { points: 0, last: '' };
      const stamp = createdAt.toISOString();
      // Empate é desempatado por quem chegou primeiro (docs/database.md), então
      // guardamos o PRIMEIRO crédito do período, não o último.
      perUser.set(userId, {
        points: current.points + delta,
        last: current.last && current.last < stamp ? current.last : stamp,
      });
      totals.set(key, perUser);
    }
    if (page.rows.length < 100) break;
    if (offset + 100 >= ROOF) truncated = true;
  }

  const periods: RebuildResult['periods'] = [];
  for (const [key, perUser] of [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const [userId, total] of perUser) {
      const id = rowId('rank', key, userId);
      const data = {
        periodKey: key,
        userId,
        earnedPoints: total.points,
        lastEarnedAt: total.last,
      };
      const existing = await listTableRows(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'ranking_entries',
        queries: [Query.equal('periodKey', key), Query.equal('userId', userId), Query.limit(1)],
      });
      if (existing.rows[0])
        await updateTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'ranking_entries',
          rowId: String(existing.rows[0].$id),
          data,
        });
      else
        await createTableRow(ctx.tables, {
          databaseId: ctx.databaseId,
          tableId: 'ranking_entries',
          rowId: id,
          data,
          permissions: [Permission.read(Role.users())],
        });
    }
    periods.push({
      periodKey: key,
      entries: perUser.size,
      earnedPoints: [...perUser.values()].reduce((sum, entry) => sum + entry.points, 0),
    });
  }
  return done({ periods, scanned, truncated });
}
