import { Permission, Role } from 'node-appwrite';
import { describe, expect, it } from 'vitest';
import {
  rowId,
  saveChallenge,
  saveReward,
  type CoreContext,
} from '../../src/features/workspace/core';
import { rankingTimeZone } from '../../src/features/workspace/domain/ranking';
import type { ChallengeDraft, RewardDraft } from '../../src/features/workspace/domain/catalog';

/**
 * O que a edição GRAVA — e não só o que ela responde.
 *
 * Achado por teste de integração contra o staging, não por leitura: salvar um
 * desafio devolvia `version: 3` enquanto gravava só os campos do formulário. A
 * linha ficava na versão antiga, e disso saíam dois defeitos que ninguém veria
 * na tela:
 *
 *  - `expectedVersion` parava de barrar: a segunda pessoa com a tela aberta
 *    mandava a mesma versão que a primeira (a versão da linha não andou) e a
 *    última digitação vencia em silêncio;
 *  - publicar um rascunho existente dava permissão de leitura à linha sem trocar
 *    o estado: desafio legível para toda creator e, ao mesmo tempo, fora do que
 *    o produto considera "no ar".
 *
 * O dublê abaixo é o banco no mínimo que estas escritas usam, mas com uma
 * diferença deliberada em relação aos outros dublês: ele APLICA a escrita e
 * devolve o que ficou. É o único jeito de a asserção ser sobre o banco, e não
 * sobre o retorno.
 */

type Row = Record<string, unknown>;
type Write = { tableId: string; rowId: string; data?: Row; permissions?: string[] };

/** Banco de mentira que aplica a escrita e guarda o que foi escrito. */
function ledger(seed: Record<string, Row[]> = {}) {
  const store: Record<string, Map<string, Row>> = {};
  for (const [tableId, rows] of Object.entries(seed))
    store[tableId] = new Map(rows.map((row) => [String(row.$id), row]));
  const writes: Write[] = [];
  const table = (tableId: string) => (store[tableId] ??= new Map<string, Row>());

  const api = {
    createTransaction: async () => ({ $id: 'tx-sintetica' }),
    updateTransaction: async () => undefined,
    deleteTransaction: async () => undefined,
    getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
      const row = table(tableId).get(rowId);
      // 404 é o formato que o contrato lê como "não existe" — não um erro qualquer.
      if (!row) throw Object.assign(new Error('not found'), { code: 404 });
      return row;
    },
    listRows: async ({ tableId }: { tableId: string }) => ({
      rows: [...table(tableId).values()],
      total: table(tableId).size,
    }),
    createRow: async (params: Write) => {
      writes.push(params);
      const row = { ...params.data, $id: params.rowId, $permissions: params.permissions ?? [] };
      table(params.tableId).set(params.rowId, row);
      return row;
    },
    updateRow: async (params: Write) => {
      writes.push(params);
      const current = table(params.tableId).get(params.rowId) ?? { $id: params.rowId };
      const row = {
        ...current,
        ...params.data,
        $permissions: params.permissions ?? current.$permissions ?? [],
      };
      table(params.tableId).set(params.rowId, row);
      return row;
    },
    deleteRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
      table(tableId).delete(rowId);
    },
    incrementRowColumn: async () => undefined,
    decrementRowColumn: async () => undefined,
  };

  return {
    api: api as never,
    /** O que EXISTE agora na tabela — a leitura que a próxima requisição faria. */
    row: (tableId: string, rowId: string) => store[tableId]?.get(rowId),
    /** O último patch dado nesta tabela: é o que a edição realmente gravou. */
    lastWrite: (tableId: string) => writes.filter((write) => write.tableId === tableId).at(-1),
  };
}

function context(api: unknown): CoreContext {
  return {
    tables: api as CoreContext['tables'],
    databaseId: 'nuy-creators',
    actor: { userId: 'staff', roles: ['admin'] },
    now: new Date('2026-10-07T15:00:00.000Z'),
    correlationId: 'unit-catalog-write',
  };
}

const slug = 'desafio-editado';
const challengeId = rowId('challenge', slug);

const challenge = (name: string): ChallengeDraft => ({
  slug,
  name,
  description: 'Desafio do teste de escrita do catálogo.',
  platform: 'instagram',
  startsAt: '2026-10-01T09:00',
  endsAt: '2026-11-01T23:59',
  points: 800,
  imageFileId: '',
  requiredLevelId: '',
  participantLimit: null,
  campaignId: '',
  productId: '',
  hashtags: '#nuycreators',
  mentions: '@nuycreators',
  requirements: [{ type: 'link', required: true, configJson: '{"value":"link"}' }],
});

const live = [Permission.read(Role.any())];
const challengeRow = (status: string, version: number, permissions = live): Row[] => [
  {
    $id: challengeId,
    slug,
    name: 'Desafio como está no banco',
    status,
    version,
    participantCount: 0,
    $permissions: permissions,
  },
];

describe('o que a edição grava no banco', () => {
  it('avança a versão e preserva o estado no MESMO patch dos campos do formulário', async () => {
    const db = ledger({ challenges: challengeRow('published', 2) });
    const saved = await saveChallenge(context(db.api), {
      draft: challenge('Desafio revisado'),
      publish: false,
      expectedVersion: 2,
      timeZone: rankingTimeZone,
    });

    expect(saved.ok && saved.value).toMatchObject({ status: 'published', version: 3 });
    // A linha tem que acompanhar o que foi respondido: é ela que a próxima
    // requisição lê, e é ela que o `expectedVersion` da próxima edição confere.
    expect(db.row('challenges', challengeId)).toMatchObject({ version: 3, status: 'published' });
    // Editar não tira do ar quem já está no ar.
    expect(db.lastWrite('challenges')?.permissions).toEqual(live);
  });

  it('a edição seguinte com a versão antiga é recusada — o número andou de verdade', async () => {
    const db = ledger({ challenges: challengeRow('published', 2) });
    await saveChallenge(context(db.api), {
      draft: challenge('Desafio revisado'),
      publish: false,
      expectedVersion: 2,
      timeZone: rankingTimeZone,
    });
    const second = await saveChallenge(context(db.api), {
      draft: challenge('Desafio revisado por outra pessoa'),
      publish: false,
      expectedVersion: 2,
      timeZone: rankingTimeZone,
    });
    expect(second).toMatchObject({ ok: false, failure: { code: 'conflict' } });
    expect(db.row('challenges', challengeId)?.name).toBe('Desafio revisado');
  });

  it('publicar um rascunho que já existe troca estado, versão e permissão juntos', async () => {
    const db = ledger({ challenges: challengeRow('draft', 1, []) });
    const saved = await saveChallenge(context(db.api), {
      draft: challenge('Desafio que sai do rascunho'),
      publish: true,
      expectedVersion: 1,
      timeZone: rankingTimeZone,
    });

    expect(saved.ok && saved.value).toMatchObject({ status: 'published', version: 2 });
    const write = db.lastWrite('challenges');
    expect(write?.data).toMatchObject({ status: 'published', version: 2 });
    expect(write?.permissions).toEqual(live);
    // O que a creator vai encontrar: linha no ar E estado no ar. Um sem o outro
    // é o defeito — legível para todo mundo e ainda listado como rascunho.
    expect(db.row('challenges', challengeId)).toMatchObject({
      status: 'published',
      version: 2,
      $permissions: live,
    });
  });

  it('recompensa: a mesma regra, inclusive no estoque que a tela manda', async () => {
    const rewardId = rowId('reward', 'chave-de-teste-da-escri');
    const draft = (stock: number): RewardDraft => ({
      name: 'Recompensa editada',
      type: 'produto físico',
      description: 'Recompensa do teste de escrita do catálogo.',
      pointsCost: 250,
      stock,
      perUserLimit: 1,
      startsAt: '2026-10-01T09:00',
      endsAt: '2026-11-01T23:59',
      imageFileId: '',
    });
    const db = ledger({
      rewards: [{ $id: rewardId, status: 'draft', version: 1, stock: 3, $permissions: [] }],
    });

    const saved = await saveReward(context(db.api), {
      key: 'chave-de-teste-da-escri',
      rewardId,
      draft: draft(5),
      publish: true,
      expectedVersion: 1,
      timeZone: rankingTimeZone,
    });

    expect(saved.ok && saved.value).toMatchObject({ status: 'published', version: 2, stock: 5 });
    expect(db.lastWrite('rewards')?.data).toMatchObject({ status: 'published', version: 2 });
    expect(db.row('rewards', rewardId)).toMatchObject({
      status: 'published',
      version: 2,
      stock: 5,
      $permissions: live,
    });
  });
});
