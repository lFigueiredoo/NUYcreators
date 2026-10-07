import { describe, expect, it, vi } from 'vitest';
import { Query } from 'node-appwrite';
import {
  AUDIT_SNAPSHOTS_TABLE,
  composeAuditLog,
  countTableRows,
  decrementColumn,
  getTableRow,
  isConflict,
  listTableRows,
  normalizeRow,
  openTransaction,
  refusal,
  rollbackTransaction,
  sanitize,
  snapshotRowId,
  splitAuditLog,
  commitTransaction,
  discardTransaction,
} from '../../src/lib/appwrite/data';

const databaseId = 'nuy-creators';

/**
 * O adaptador é a fronteira de API: o que ele garante é contrato (nome de
 * argumento, formato de retorno, erro que sobe) — nunca "documentação". Cada
 * teste aqui falha se a API do TablesDB for chamada de outro jeito.
 */
describe('adaptador de linhas (TablesDB)', () => {
  it('normaliza $collectionId legado para $tableId sem mutar a linha', () => {
    const legacy = { $id: 'row', $collectionId: 'profiles', userId: 'user' };
    expect(normalizeRow(legacy)).toEqual({ ...legacy, $tableId: 'profiles' });
    expect(legacy).not.toHaveProperty('$tableId');
    expect(normalizeRow({ $id: 'row', $tableId: 'profiles' })).toEqual({
      $id: 'row',
      $tableId: 'profiles',
    });
  });
  it('lê linhas com databaseId/tableId e devolve rows normalizadas com o total', async () => {
    const listRows = vi.fn(async () => ({
      total: 2,
      rows: [
        { $id: 'a', $collectionId: 'rewards' },
        { $id: 'b', $tableId: 'rewards' },
      ],
    }));
    const result = await listTableRows({ listRows } as never, {
      databaseId,
      tableId: 'rewards',
      queries: [Query.equal('status', 'active')],
    });
    expect(listRows).toHaveBeenCalledWith({
      databaseId,
      tableId: 'rewards',
      queries: [Query.equal('status', 'active')],
    });
    expect(result.total).toBe(2);
    expect(result.rows.map((row) => row.$tableId)).toEqual(['rewards', 'rewards']);
  });
  it('conta com página mínima e lê linha única pelo id', async () => {
    const listRows = vi.fn(async () => ({ total: 7, rows: [] }));
    expect(
      await countTableRows({ listRows } as never, { databaseId, tableId: 'notifications' }),
    ).toBe(7);
    expect(listRows).toHaveBeenCalledWith({
      databaseId,
      tableId: 'notifications',
      queries: [Query.limit(1)],
    });
    const getRow = vi.fn(async () => ({ $id: 'viewer', $collectionId: 'profiles' }));
    expect(
      await getTableRow({ getRow } as never, { databaseId, tableId: 'profiles', rowId: 'viewer' }),
    ).toEqual({ $id: 'viewer', $collectionId: 'profiles', $tableId: 'profiles' });
  });
  it('não engole o erro da API: quem chama decide o significado', async () => {
    const listRows = vi.fn(async () => {
      throw Object.assign(new Error('denied'), { code: 403, type: 'user_unauthorized' });
    });
    await expect(
      listTableRows({ listRows } as never, { databaseId, tableId: 'profiles' }),
    ).rejects.toMatchObject({ code: 403 });
  });
});

describe('adaptador de transações', () => {
  it('abre com TTL, comita, desfaz e descarta com o nome certo de cada operação', async () => {
    const createTransaction = vi.fn(async () => ({ $id: 'tx-1' }));
    const updateTransaction = vi.fn(async () => ({ $id: 'tx-1' }));
    const deleteTransaction = vi.fn(async () => ({}));
    const tables = { createTransaction, updateTransaction, deleteTransaction } as never;
    const id = await openTransaction(tables, 90);
    expect(createTransaction).toHaveBeenCalledWith({ ttl: 90 });
    await commitTransaction(tables, id);
    expect(updateTransaction).toHaveBeenCalledWith({ transactionId: 'tx-1', commit: true });
    await rollbackTransaction(tables, id);
    expect(updateTransaction).toHaveBeenLastCalledWith({ transactionId: 'tx-1', rollback: true });
    await discardTransaction(tables, id);
    expect(deleteTransaction).toHaveBeenCalledWith({ transactionId: 'tx-1' });
  });
  it('debita com limite na coluna e dentro da transação', async () => {
    const decrementRowColumn = vi.fn(async () => ({ $id: 'account' }));
    await decrementColumn({ decrementRowColumn } as never, {
      databaseId,
      tableId: 'point_accounts',
      rowId: 'user',
      column: 'availableBalance',
      value: 250,
      min: 0,
      transactionId: 'tx-9',
    });
    expect(decrementRowColumn).toHaveBeenCalledWith({
      databaseId,
      tableId: 'point_accounts',
      rowId: 'user',
      column: 'availableBalance',
      value: 250,
      min: 0,
      transactionId: 'tx-9',
    });
  });
  it('mede a recusa com status, código e mensagem sanitizada', () => {
    const secret = 'chave-de-teste-nao-pode-vazar';
    const error = Object.assign(new Error(`The transaction has a conflict (${secret}).`), {
      code: 409,
      type: 'transaction_conflict',
    });
    const measured = refusal(error, [secret]);
    expect(measured).toEqual({
      status: 409,
      code: 409,
      type: 'transaction_conflict',
      message: 'The transaction has a conflict ([redacted]).',
    });
    expect(isConflict(error)).toBe(true);
    expect(isConflict(Object.assign(new Error('x'), { code: 400 }))).toBe(false);
    expect(sanitize('sem segredo', [undefined, ''])).toBe('sem segredo');
    expect(refusal({ code: 400, type: 'attribute_limit_exceeded' }).status).toBe(400);
    expect(refusal('não é erro do SDK').status).toBe(-1);
  });
});

describe('snapshots de auditoria (único mapeamento não 1:1)', () => {
  const log = {
    $id: 'log-1',
    action: 'reward.redeemed',
    beforeJson: { stock: 3 },
    afterJson: { stock: 2 },
  };
  it('separa o log em linha + snapshots com id determinístico', () => {
    const { log: row, snapshots } = splitAuditLog(log);
    expect(row).toEqual({ $id: 'log-1', action: 'reward.redeemed' });
    expect(snapshots).toEqual([
      {
        $id: snapshotRowId('log-1', 'before'),
        auditLogId: 'log-1',
        side: 'before',
        payloadJson: '{"stock":3}',
      },
      {
        $id: snapshotRowId('log-1', 'after'),
        auditLogId: 'log-1',
        side: 'after',
        payloadJson: '{"stock":2}',
      },
    ]);
    expect(AUDIT_SNAPSHOTS_TABLE).toBe('audit_log_snapshots');
  });
  it('não cria snapshot sem conteúdo e recompõe o que existe', () => {
    expect(splitAuditLog({ $id: 'log-2', beforeJson: null }).snapshots).toEqual([]);
    const { snapshots } = splitAuditLog(log);
    expect(composeAuditLog({ $id: 'log-1' }, snapshots)).toEqual({
      $id: 'log-1',
      beforeJson: { stock: 3 },
      afterJson: { stock: 2 },
    });
  });
  it('snapshot ausente ou corrompido vira null, nunca objeto vazio', () => {
    expect(composeAuditLog({ $id: 'log-3' }, []).beforeJson).toBeNull();
    expect(
      composeAuditLog({ $id: 'log-3' }, [
        { auditLogId: 'log-3', side: 'after', payloadJson: 'não é json' },
      ]).afterJson,
    ).toBeNull();
    expect(
      composeAuditLog({ $id: 'log-3' }, [{ auditLogId: 'log-3', side: 'after' }]).afterJson,
    ).toBeNull();
  });
});
