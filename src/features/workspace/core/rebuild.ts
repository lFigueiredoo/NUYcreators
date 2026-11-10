import { Query } from 'node-appwrite';
import {
  createTableRow,
  listTableRows,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { Permission, Role } from 'node-appwrite';
import { done, requiresStaff, type CoreContext, type CoreResult } from './context';
import { periodKey, rowId } from './ids';
import { inTransaction } from './transaction';
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
  /** Mantido no contrato da Function; paginação completa agora sempre devolve `false`. */
  truncated: boolean;
};

const PAGE = 100;

async function syncRankingProfiles(ctx: CoreContext, transactionId: string) {
  const profiles = await allRows(ctx, 'profiles', transactionId);
  const publicProfiles = await allRows(ctx, 'public_creator_profiles', transactionId);
  const publicByUser = new Map(
    publicProfiles
      .map((row) => [typeof row.userId === 'string' ? row.userId : '', row] as const)
      .filter(([userId]) => Boolean(userId)),
  );

  for (const profile of profiles) {
    const userId = typeof profile.userId === 'string' ? profile.userId : '';
    const displayName = typeof profile.name === 'string' ? profile.name.trim().slice(0, 100) : '';
    if (!userId || !displayName || !profile.onboardingCompletedAt) continue;
    const existing = publicByUser.get(userId);
    if (existing) {
      if (existing.displayName === displayName) continue;
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'public_creator_profiles',
        rowId: String(existing.$id),
        data: { displayName },
        transactionId,
      });
      continue;
    }
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'public_creator_profiles',
      rowId: userId,
      data: { userId, displayName },
      permissions: [Permission.read(Role.users())],
      transactionId,
    });
  }
}

/**
 * Percorre a tabela inteira com ordem estável. Não existe “continuação” falsa:
 * a projeção só é chamada reconstruída depois de a fonte e o destino terminarem.
 */
async function allRows(ctx: CoreContext, tableId: string, transactionId: string): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | null = null;
  while (true) {
    const page = await listTableRows(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId,
      queries: [
        Query.orderAsc('$id'),
        Query.limit(PAGE),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
      transactionId,
    });
    rows.push(...page.rows);
    if (page.rows.length < PAGE) return rows;
    const next = page.rows.at(-1)?.$id;
    if (typeof next !== 'string' || next === cursor) return rows;
    cursor = next;
  }
}

export async function rebuildRanking(
  ctx: CoreContext,
  input: { period?: string } = {},
): Promise<CoreResult<RebuildResult>> {
  const blocked = requiresStaff<RebuildResult>(ctx, 'manage-catalog');
  if (blocked) return blocked;

  return inTransaction(ctx, async (tx) => {
    const transactionId = tx.transactionId;
    if (!transactionId) throw new Error('rebuild_transaction_missing');
    const totals = new Map<string, Map<string, { points: number; last: string; campaignId: string | null }>>();
    await syncRankingProfiles(ctx, transactionId);
    const ledger = await allRows(ctx, 'point_transactions', transactionId);
    const submissions = await allRows(ctx, 'challenge_submissions', transactionId);
    const submissionCampaigns = new Map<string, string>();
    const challengeIds = [...new Set(
      submissions
        .map((row) => (typeof row.challengeId === 'string' ? row.challengeId : ''))
        .filter(Boolean),
    )];
    if (challengeIds.length) {
      const challenges = await allRows(ctx, 'challenges', transactionId);
      const campaigns = new Map(
        challenges
          .map((row) => [String(row.$id), typeof row.campaignId === 'string' ? row.campaignId : ''] as const)
          .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
      );
      for (const submission of submissions) {
        const submissionId = String(submission.$id);
        const campaignId = campaigns.get(String(submission.challengeId));
        if (campaignId) submissionCampaigns.set(submissionId, campaignId);
      }
    }
    for (const row of ledger) {
      const delta = typeof row.rankingDelta === 'number' ? row.rankingDelta : 0;
      if (delta <= 0) continue;
      const createdAt = typeof row.createdAt === 'string' ? new Date(row.createdAt) : null;
      const userId = typeof row.userId === 'string' ? row.userId : '';
      if (!createdAt || Number.isNaN(createdAt.getTime()) || !userId) continue;
      const key = periodKey(createdAt, rankingTimeZone);
      if (input.period && key !== input.period) continue;
      const campaignId =
        typeof row.campaignId === 'string' && row.campaignId
          ? row.campaignId
          : row.referenceType === 'challenge_submission' && typeof row.referenceId === 'string'
            ? submissionCampaigns.get(row.referenceId) ?? null
            : null;
      const scope = campaignId ? `campaign:${campaignId}` : `period:${key}`;
      const perUser = totals.get(scope) ?? new Map();
      const current = perUser.get(userId) ?? { points: 0, last: '' };
      const stamp = createdAt.toISOString();
      // A projeção ao vivo atualiza `lastEarnedAt` a cada crédito. O rebuild precisa
      // produzir o MESMO estado a partir do ledger, portanto conserva o mais recente.
      perUser.set(userId, {
        points: current.points + delta,
        last: current.last && current.last > stamp ? current.last : stamp,
        campaignId,
      });
      totals.set(scope, perUser);
    }

    const projected = await allRows(ctx, 'ranking_entries', transactionId);
    const existingByPeriod = new Map<string, Row[]>();
    for (const row of projected) {
      const campaignId = typeof row.campaignId === 'string' && row.campaignId ? row.campaignId : null;
      const period = typeof row.periodKey === 'string' ? row.periodKey : '';
      if (!period || (input.period && period !== input.period)) continue;
      const key = campaignId ? `campaign:${campaignId}` : `period:${period}`;
      const entries = existingByPeriod.get(key) ?? [];
      entries.push(row);
      existingByPeriod.set(key, entries);
    }
    // Período explícito também precisa ser reconciliado quando não há nenhum
    // crédito: nesse caso todas as linhas existentes são projeções órfãs.
    const keys = input.period
      ? [...new Set([...totals.keys(), ...existingByPeriod.keys()].filter((key) => key.endsWith(input.period!)))]
      : [...new Set([...totals.keys(), ...existingByPeriod.keys()])].sort((a, b) =>
          a.localeCompare(b),
        );
    const periods: RebuildResult['periods'] = [];
    for (const key of keys) {
      const perUser = totals.get(key) ?? new Map<string, { points: number; last: string; campaignId: string | null }>();
      const existing = existingByPeriod.get(key) ?? [];
      const existingByUser = new Map<string, Row>();
      for (const row of existing) {
        const userId = typeof row.userId === 'string' ? row.userId : '';
        if (!userId) continue;
        const current = existingByUser.get(userId);
        // Prefere a chave canônica, caso dados legados tenham criado duplicatas.
        if (!current || String(row.$id) === rowId('rank', key, userId))
          existingByUser.set(userId, row);
      }
      const survivorIds = new Set([...existingByUser.values()].map((row) => String(row.$id)));
      for (const [userId, total] of perUser) {
        const campaignId = total.campaignId;
        const period = key.startsWith('period:') ? key.slice('period:'.length) : input.period ?? '';
        const id = rowId('rank', campaignId || period, userId);
        const data = {
          periodKey: period,
          userId,
          campaignId,
          earnedPoints: total.points,
          lastEarnedAt: total.last,
        };
        const current = existingByUser.get(userId);
        if (current)
          await updateTableRow(ctx.tables, {
            databaseId: ctx.databaseId,
            tableId: 'ranking_entries',
            rowId: String(current.$id),
            data,
            transactionId,
          });
        else
          await createTableRow(ctx.tables, {
            databaseId: ctx.databaseId,
            tableId: 'ranking_entries',
            rowId: id,
            data,
            permissions: [Permission.read(Role.users())],
            transactionId,
          });
      }
      // Rebuild é reconciliação, não apenas upsert: linha sem crédito elegível no
      // ledger, inclusive duplicata antiga do mesmo usuário, não pode sobreviver.
      for (const row of existing) {
        const userId = typeof row.userId === 'string' ? row.userId : '';
        if (userId && perUser.has(userId) && survivorIds.has(String(row.$id))) continue;
        await ctx.tables.deleteRow({
          databaseId: ctx.databaseId,
          tableId: 'ranking_entries',
          rowId: String(row.$id),
          transactionId,
        });
      }
      periods.push({
        periodKey: key.startsWith('period:') ? key.slice('period:'.length) : key,
        entries: perUser.size,
        earnedPoints: [...perUser.values()].reduce((sum, entry) => sum + entry.points, 0),
      });
    }
    return done({ periods, scanned: ledger.length, truncated: false });
  });
}
