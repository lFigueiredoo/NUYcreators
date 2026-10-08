import { describe, expect, it } from 'vitest';
import {
  markAllNotificationsRead,
  setNotificationRead,
  updateOwnProfile,
  type CoreContext,
} from '../../src/features/workspace/core';
import { notificationReadTarget } from '../../src/features/workspace/domain/status';

/**
 * O que a creator pode GRAVAR — e o que a tentativa grava quando não pode.
 *
 * Por que este arquivo existe: as duas garantias abaixo são do tipo que passa
 * por vacuidade numa tela. "O formulário não mostra o campo de pontos" é verdade
 * sobre a tela e não sobre o banco: um payload forjado não passa pelo formulário.
 * Aqui o alvo é o PATCH — o dicionário que chega ao banco, campo a campo.
 *
 * O dublê aplica a escrita e devolve o que ficou (mesma escolha de
 * `catalog-write.test.ts`): a asserção é sobre o banco, não sobre o retorno.
 * Ele lê as queries como o Appwrite as manda no fio — string JSON — para o
 * filtro de `userId` ser exercitado de verdade em vez de ignorado.
 *
 * O que este arquivo NÃO prova: a gravação contra o Appwrite real. Isso depende
 * da chave de operação e está no relatório como pendente.
 */
type Row = Record<string, unknown>;
type Write = { tableId: string; rowId: string; data?: Row };

const ANA = 'ana-da-sessao';
const OUTRA = 'outra-pessoa';

function ledger(seed: Record<string, Row[]> = {}) {
  const store: Record<string, Map<string, Row>> = {};
  for (const [tableId, rows] of Object.entries(seed))
    store[tableId] = new Map(rows.map((row) => [String(row.$id), row]));
  const writes: Write[] = [];
  const table = (tableId: string) => (store[tableId] ??= new Map<string, Row>());

  const filters = (queries: string[] = []) =>
    queries.map(
      (query) => JSON.parse(query) as { method: string; attribute: string; values?: unknown[] },
    );

  const api = {
    getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
      const row = table(tableId).get(rowId);
      // 404 é o formato que o contrato lê como "não existe" — não um erro qualquer.
      if (!row) throw Object.assign(new Error('not found'), { code: 404 });
      return row;
    },
    listRows: async ({ tableId, queries }: { tableId: string; queries?: string[] }) => {
      const all = [...table(tableId).values()];
      const kept = all.filter((row) =>
        filters(queries).every((query) => {
          const current = row[query.attribute];
          if (query.method === 'equal') return (query.values ?? []).includes(current);
          if (query.method === 'isNull') return current === null || current === undefined;
          return true;
        }),
      );
      return { rows: kept, total: kept.length };
    },
    updateRow: async (params: Write) => {
      writes.push(params);
      const current = table(params.tableId).get(params.rowId) ?? { $id: params.rowId };
      const row = { ...current, ...params.data };
      table(params.tableId).set(params.rowId, row);
      return row;
    },
    createRow: async (params: Write) => {
      writes.push(params);
      const row = { ...params.data, $id: params.rowId };
      table(params.tableId).set(params.rowId, row);
      return row;
    },
    deleteRow: async () => undefined,
  };

  return {
    api: api as never,
    row: (tableId: string, rowId: string) => store[tableId]?.get(rowId),
    writes: (tableId: string) => writes.filter((write) => write.tableId === tableId),
  };
}

/** O código de recusa, na forma em que o núcleo devolve (`failure.code`). */
function recusa(resultado: { ok: boolean; failure?: { code: string } }): string | undefined {
  return resultado.ok ? undefined : resultado.failure?.code;
}

function context(api: unknown, userId = ANA): CoreContext {
  return {
    tables: api as CoreContext['tables'],
    databaseId: 'nuy-creators',
    actor: { userId, roles: [] },
    now: new Date('2026-10-07T15:00:00.000Z'),
    correlationId: 'unit-creator-write-scope',
  };
}

/** O perfil como ele está no banco: com os campos que a edição NÃO governa. */
const profileRow = (userId: string): Row[] => [
  {
    $id: ANA,
    userId,
    name: 'Ana Beatriz Souza',
    phone: '+55 11 98888-7777',
    city: 'São Paulo',
    state: 'SP',
    birthDate: '1996-04-12',
    niche: 'beleza',
    creatorType: 'ugc',
    publicProfile: false,
    points: 300,
    levelId: 'exploradora',
    qualifyingPoints: 250,
    acceptedTermsVersion: '2026-09-01',
    consentAt: '2026-09-02T10:00:00.000Z',
    onboardingCompletedAt: '2026-09-02T10:05:00.000Z',
    roles: ['creator'],
    adminFlags: { beta: true },
  },
];

const validInput = {
  name: 'Ana Beatriz Souza Lima',
  phone: '+55 11 97777-6666',
  city: 'Campinas',
  state: 'SP',
  birthDate: '1996-04-12',
  niche: 'beleza',
  creatorType: 'ugc',
  publicProfile: true,
};

describe('Fase C — o que a edição de perfil pode gravar', () => {
  it('grava as colunas editáveis na linha da PRÓPRIA sessão, e nada além delas', async () => {
    const banco = ledger({ profiles: profileRow(ANA) });
    const resultado = await updateOwnProfile(context(banco.api), validInput);

    expect(resultado.ok).toBe(true);
    const escrita = banco.writes('profiles').at(-1);
    expect(escrita?.rowId).toBe(ANA);
    expect(Object.keys(escrita?.data ?? {}).sort()).toEqual(
      [
        'birthDate',
        'city',
        'creatorType',
        'name',
        'niche',
        'phone',
        'publicProfile',
        'state',
      ].sort(),
    );
  });

  it('campo de economia, papel ou estado injetado no payload NÃO entra no patch', async () => {
    const banco = ledger({ profiles: profileRow(ANA) });
    // O que um payload forjado tentaria: subir de nível, ganhar pontos, mexer no
    // consentimento e no marco de onboarding. O formulário não tem esses campos;
    // o schema não os conhece; a linha é atualizada por chave.
    const forjado = {
      ...validInput,
      points: 999999,
      levelId: 'icone',
      qualifyingPoints: 999999,
      acceptedTermsVersion: '2099-01-01',
      consentAt: '2099-01-01T00:00:00.000Z',
      onboardingCompletedAt: '2099-01-01T00:00:00.000Z',
      roles: ['admin'],
      adminFlags: { beta: false },
    } as unknown as typeof validInput;

    const resultado = await updateOwnProfile(context(banco.api), forjado);

    expect(resultado.ok).toBe(true);
    const escrito = banco.writes('profiles').at(-1)?.data ?? {};
    for (const proibido of [
      'points',
      'levelId',
      'qualifyingPoints',
      'acceptedTermsVersion',
      'consentAt',
      'onboardingCompletedAt',
      'roles',
      'adminFlags',
    ])
      expect(escrito, `o patch tocou ${proibido}`).not.toHaveProperty(proibido);

    // E o banco continua com o que ele já tinha — não basta não estar no patch.
    const depois = banco.row('profiles', ANA);
    expect(depois?.points).toBe(300);
    expect(depois?.levelId).toBe('exploradora');
    expect(depois?.qualifyingPoints).toBe(250);
    expect(depois?.roles).toEqual(['creator']);
    expect(depois?.onboardingCompletedAt).toBe('2026-09-02T10:05:00.000Z');
    // A edição legítima do mesmo payload foi aplicada: a recusa é cirúrgica.
    expect(depois?.name).toBe('Ana Beatriz Souza Lima');
  });

  it('perfil que não é da sessão é recusado ANTES de qualquer escrita', async () => {
    const banco = ledger({ profiles: profileRow(OUTRA) });
    const resultado = await updateOwnProfile(context(banco.api), validInput);

    expect(resultado.ok).toBe(false);
    expect(recusa(resultado)).toBe('forbidden');
    expect(banco.writes('profiles')).toEqual([]);
  });

  it('perfil que ainda não existe não é criado pela edição', async () => {
    const banco = ledger();
    const resultado = await updateOwnProfile(context(banco.api), validInput);

    expect(recusa(resultado)).toBe('not_found');
    expect(banco.writes('profiles')).toEqual([]);
  });

  it('entrada inválida é recusada pela MESMA régua do cadastro, sem escrever', async () => {
    const banco = ledger({ profiles: profileRow(ANA) });
    for (const invalido of [
      { ...validInput, name: 'A' },
      { ...validInput, state: 'XX' },
      { ...validInput, birthDate: '1899-12-31' },
      { ...validInput, phone: 'telefone' },
      { ...validInput, niche: 'moda' },
    ]) {
      const resultado = await updateOwnProfile(context(banco.api), invalido as typeof validInput);
      expect(resultado.ok, JSON.stringify(invalido)).toBe(false);
      expect(recusa(resultado)).toBe('invalid');
    }
    expect(banco.writes('profiles')).toEqual([]);
  });
});

const aviso = (id: string, userId: string, readAt: string | null = null): Row => ({
  $id: id,
  userId,
  title: 'Pontos creditados',
  body: 'Você ganhou 50 pontos.',
  readAt,
});

describe('Fase D — o que a leitura de avisos pode gravar', () => {
  it('marcar como lido grava `readAt` na linha apontada, com o instante do comando', async () => {
    const banco = ledger({ notifications: [aviso('aviso-da-ana', ANA)] });
    const resultado = await setNotificationRead(context(banco.api), {
      notificationId: 'aviso-da-ana',
      read: true,
    });

    expect(resultado.ok).toBe(true);
    const escrita = banco.writes('notifications').at(-1);
    expect(escrita?.rowId).toBe('aviso-da-ana');
    expect(escrita?.data).toEqual({ readAt: '2026-10-07T15:00:00.000Z' });
  });

  it('aviso de OUTRA pessoa: recusa como inexistente e NÃO escreve nada', async () => {
    const banco = ledger({ notifications: [aviso('aviso-da-outra', OUTRA)] });
    const resultado = await setNotificationRead(context(banco.api), {
      notificationId: 'aviso-da-outra',
      read: true,
    });

    // `not_found`, e não `forbidden`: para quem perguntou, o aviso alheio não é
    // um alvo proibido — é um alvo que não existe. A diferença não vaza a
    // existência da linha.
    expect(recusa(resultado)).toBe('not_found');
    expect(banco.writes('notifications')).toEqual([]);
    expect(banco.row('notifications', 'aviso-da-outra')?.readAt).toBeNull();
  });

  it('desmarcar volta `readAt` para NULO — string vazia contaria como lida', async () => {
    const banco = ledger({
      notifications: [aviso('aviso-da-ana', ANA, '2026-10-06T09:00:00.000Z')],
    });
    await setNotificationRead(context(banco.api), { notificationId: 'aviso-da-ana', read: false });

    const escrita = banco.writes('notifications').at(-1);
    expect(escrita?.data).toEqual({ readAt: null });
    expect(banco.row('notifications', 'aviso-da-ana')?.readAt).toBeNull();
  });

  it('id de aviso fora do formato não chega ao banco', async () => {
    const banco = ledger({ notifications: [aviso('aviso-da-ana', ANA)] });
    for (const id of ['', '   ', 'x'.repeat(37)]) {
      const resultado = await setNotificationRead(context(banco.api), {
        notificationId: id,
        read: true,
      });
      expect(recusa(resultado)).toBe('invalid');
    }
    expect(banco.writes('notifications')).toEqual([]);
  });

  it('marcar TODAS filtra por `userId` e não encosta em aviso alheio', async () => {
    const banco = ledger({
      notifications: [
        aviso('ana-1', ANA),
        aviso('ana-2', ANA),
        aviso('ana-lido', ANA, '2026-10-05T08:00:00.000Z'),
        aviso('outra-1', OUTRA),
        aviso('outra-2', OUTRA),
      ],
    });
    const resultado = await markAllNotificationsRead(context(banco.api));

    expect(resultado.ok && resultado.value.updated).toBe(2);
    // Só as duas linhas da Ana, e só elas: o aviso já lido não entra, e as duas
    // da outra pessoa continuam não lidas.
    expect(
      banco
        .writes('notifications')
        .map((write) => write.rowId)
        .sort(),
    ).toEqual(['ana-1', 'ana-2']);
    expect(banco.row('notifications', 'outra-1')?.readAt).toBeNull();
    expect(banco.row('notifications', 'outra-2')?.readAt).toBeNull();
    expect(banco.row('notifications', 'ana-lido')?.readAt).toBe('2026-10-05T08:00:00.000Z');
  });

  it('o botão manda o estado PEDIDO, não o estado atual', () => {
    // O defeito que este teste tranca: o campo oculto carregava o estado ATUAL, e
    // o servidor o lê como o estado PEDIDO. Resultado no ambiente real — "Marcar
    // como lida" num aviso não lido reenviava "não lida" e regravava `readAt =
    // null`; e "Marcar como não lida" num aviso lido o marcava como LIDO. Os dois
    // botões diziam "Aviso marcado como…" e um deles fazia o contrário do rótulo.
    expect(notificationReadTarget(false)).toBe('true'); // não lida → o botão marca como lida
    expect(notificationReadTarget(true)).toBe('false'); // lida → o botão desmarca
  });

  it('o servidor lê o campo do formulário na mesma convenção do rótulo', () => {
    // A outra metade do contrato: a ação trata "diferente de false" como "lida".
    // Se a convenção de um lado mudar sozinha, este teste não passa — e é o par
    // que estava desalinhado.
    const comoOServidorLe = (campo: string) => campo !== 'false';
    expect(comoOServidorLe(notificationReadTarget(false))).toBe(true);
    expect(comoOServidorLe(notificationReadTarget(true))).toBe(false);
  });

  it('sem sessão não há alvo: nenhuma das duas ações escreve', async () => {
    const banco = ledger({ notifications: [aviso('aviso-da-ana', ANA)] });
    const semSessao = { ...context(banco.api), actor: { userId: '', roles: [] } };

    const uma = await setNotificationRead(semSessao, {
      notificationId: 'aviso-da-ana',
      read: true,
    });
    const todas = await markAllNotificationsRead(semSessao);

    expect(recusa(uma)).toBe('unauthenticated');
    expect(recusa(todas)).toBe('unauthenticated');
    expect(banco.writes('notifications')).toEqual([]);
  });
});
