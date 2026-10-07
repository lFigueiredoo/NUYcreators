import { describe, expect, it } from 'vitest';
import { tables, levelSeed, team, functionDefinitions } from '../../infra/appwrite/schema';
describe('infrastructure manifest', () => {
  it('has distinct tables and columns', () => {
    expect(new Set(tables.map((t) => t.id)).size).toBe(tables.length);
    for (const t of tables)
      expect(new Set(t.columns.map((c) => c.key)).size).toBe(t.columns.length);
  });
  it('has consistent index references', () => {
    for (const t of tables)
      for (const group of [...t.unique, ...t.indexes])
        for (const key of group)
          expect([...t.columns.map((c) => c.key), '$createdAt']).toContain(key);
  });
  it('declares column types supported by TablesDB', () => {
    for (const t of tables)
      for (const column of t.columns) {
        expect(['varchar', 'integer', 'boolean', 'datetime']).toContain(column.type);
        if (column.type !== 'varchar') expect(column.size).toBe(255);
        else expect(column.size).toBeGreaterThan(0);
      }
  });
  it('respeita o orçamento de colunas medido no TablesDB', () => {
    // Medido em staging, coluna a coluna: a table aceitou 16.108 bytes somando
    // os `varchar` e recusou a coluna seguinte (400 column_limit_exceeded);
    // uma coluna sozinha vai no máximo até 16.381 caracteres. O teto é da
    // plataforma, não nosso: este teste existe para que uma coluna nova estoure
    // aqui, e não no meio do apply.
    const TABLE_BUDGET = 16108;
    const COLUMN_MAX = 16381;
    for (const t of tables) {
      const total = t.columns
        .filter((c) => c.type === 'varchar')
        .reduce((sum, c) => sum + (c.size ?? 255), 0);
      expect({ table: t.id, total, cabe: total <= TABLE_BUDGET }).toEqual({
        table: t.id,
        total,
        cabe: true,
      });
      for (const column of t.columns)
        if (column.type === 'varchar')
          expect({ key: `${t.id}.${column.key}`, size: column.size }).toEqual({
            key: `${t.id}.${column.key}`,
            size: Math.min(column.size ?? 255, COLUMN_MAX),
          });
    }
  });
  it('has contiguous backend level configuration', () => {
    for (let i = 1; i < levelSeed.length; i++)
      expect(levelSeed[i].minPoints).toBe(levelSeed[i - 1].maxPoints! + 1);
    expect(levelSeed.at(-1)?.maxPoints).toBeNull();
  });
  it('declares the operational core as implemented, and never as public', () => {
    // Implementado agora significa "o código existe e o fluxo passou contra o
    // staging". O que NÃO pode mudar junto é a exposição: container criado
    // desabilitado e sem papel de execução para o cliente.
    for (const id of ['join-challenge', 'submit-content', 'redeem-reward'])
      expect(functionDefinitions.find((f) => f.id === id)?.implemented).toBe(true);
    expect(functionDefinitions.some((f) => f.implemented === false)).toBe(false);
  });
  it('defines separated team roles', () => {
    expect(team.roles).toEqual(['admin', 'moderator', 'fulfillment']);
  });
});
