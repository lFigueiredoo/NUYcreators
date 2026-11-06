import { describe, expect, it } from 'vitest';
import { CURRENT_LEGAL_CONSENT_VERSION } from '../../src/features/legal/versions';
import {
  ensureCreatorApplication,
  loadCreatorApplications,
  reviewCreatorApplication,
} from '../../src/features/accounts/core/approval';
import {
  accountApprovalStatus,
  approvalKey,
  approvalRowId,
  parseApprovalRecord,
} from '../../src/features/accounts/domain/approval';
import type { CoreContext } from '../../src/features/workspace/core/context';

type Row = Record<string, unknown> & { $id: string };
type Store = Map<string, Map<string, Row>>;
type Params = { tableId: string; rowId: string; transactionId?: string };
function memory(seed: Record<string, Row[]> = {}) {
  let committed: Store = new Map(
    Object.entries(seed).map(([table, rows]) => [
      table,
      new Map(rows.map((row) => [row.$id, structuredClone(row)])),
    ]),
  );
  const transactions = new Map<string, Store>();
  let sequence = 0;
  let rejectNextCommit = false;
  const store = (id?: string) => (id ? transactions.get(id)! : committed);
  const table = (name: string, id?: string) => {
    const current = store(id);
    if (!current.has(name)) current.set(name, new Map());
    return current.get(name)!;
  };
  const api = {
    createTransaction: async () => {
      const id = `tx-${++sequence}`;
      transactions.set(id, structuredClone(committed));
      return { $id: id };
    },
    updateTransaction: async ({
      transactionId,
      commit,
    }: {
      transactionId: string;
      commit?: boolean;
    }) => {
      if (commit) {
        if (rejectNextCommit) {
          rejectNextCommit = false;
          throw Object.assign(new Error('conflict'), { code: 409 });
        }
        committed = transactions.get(transactionId)!;
      }
      return {};
    },
    deleteTransaction: async ({ transactionId }: { transactionId: string }) => {
      transactions.delete(transactionId);
      return {};
    },
    getRow: async ({ tableId, rowId, transactionId }: Params) => {
      const row = table(tableId, transactionId).get(rowId);
      if (!row) throw Object.assign(new Error('not found'), { code: 404 });
      return row;
    },
    createRow: async (
      params: Params & { data: Record<string, unknown>; permissions?: string[] },
    ) => {
      const target = table(params.tableId, params.transactionId);
      if (target.has(params.rowId)) throw Object.assign(new Error('duplicate'), { code: 409 });
      const row = { ...params.data, $id: params.rowId, $permissions: params.permissions ?? [] };
      target.set(params.rowId, row);
      return row;
    },
    updateRow: async (
      params: Params & { data?: Record<string, unknown>; permissions?: string[] },
    ) => {
      const target = table(params.tableId, params.transactionId);
      if (!target.has(params.rowId)) throw Object.assign(new Error('not found'), { code: 404 });
      const row = {
        ...target.get(params.rowId)!,
        ...params.data,
        ...(params.permissions ? { $permissions: params.permissions } : {}),
      };
      target.set(params.rowId, row);
      return row;
    },
    listRows: async ({
      tableId,
      queries = [],
      transactionId,
    }: {
      tableId: string;
      queries?: string[];
      transactionId?: string;
    }) => {
      const parsed = queries.map(
        (query) => JSON.parse(query) as { method: string; attribute?: string; values?: unknown[] },
      );
      let rows = [...table(tableId, transactionId).values()].sort((a, b) =>
        a.$id.localeCompare(b.$id),
      );
      for (const query of parsed) {
        if (query.method === 'equal')
          rows = rows.filter((row) => query.values!.includes(row[query.attribute!]));
        if (query.method === 'cursorAfter')
          rows = rows.filter((row) => row.$id.localeCompare(String(query.values![0])) > 0);
      }
      const limit = parsed.find((query) => query.method === 'limit')?.values?.[0];
      return { total: rows.length, rows: rows.slice(0, typeof limit === 'number' ? limit : 100) };
    },
  };
  return {
    api: api as unknown as CoreContext['tables'],
    row: (name: string, id: string) => table(name).get(id),
    rows: (name: string) => [...table(name).values()],
    failCommit: () => {
      rejectNextCommit = true;
    },
  };
}

const USER = 'creator-1';
const request = {
  name: 'Ana Creator',
  email: 'ana@example.test',
  authCreatedAt: '2026-11-06T12:00:00.000Z',
  consentVersion: CURRENT_LEGAL_CONSENT_VERSION,
  consentAt: '2026-11-06T12:01:00.000Z',
};
const user = (status = 'pending_review', id = USER): Row => ({
  $id: id,
  authUserId: id,
  status,
  acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
  consentAt: request.consentAt,
  $createdAt: request.authCreatedAt,
});
const profile = (id = USER): Row => ({
  $id: id,
  userId: id,
  name: 'Ana Creator',
  city: 'João Pessoa',
  onboardingCompletedAt: '2026-11-06T12:02:00.000Z',
});
const application = (id = USER, status = 'pending_review'): Row => ({
  $id: approvalRowId(id),
  key: approvalKey(id),
  public: false,
  valueJson: JSON.stringify({
    userId: id,
    ...request,
    requestedAt: request.authCreatedAt,
    status,
    reviewedAt: null,
    reviewedBy: null,
    reason: null,
  }),
});
const context = (
  db: ReturnType<typeof memory>,
  roles: CoreContext['actor']['roles'] = [],
  userId = USER,
): CoreContext => ({
  tables: db.api,
  databaseId: 'nuy-creators',
  actor: { userId, roles },
  now: new Date('2026-11-06T13:00:00.000Z'),
  correlationId: 'account-approval-test',
});

describe('solicitação de cadastro', () => {
  it('cria pending_review para a identidade da sessão e guarda metadados privados', async () => {
    const db = memory();
    const spoof = { ...request, userId: 'another-user', status: 'active' };
    expect(await ensureCreatorApplication(context(db), spoof)).toEqual({
      ok: true,
      value: { userId: USER, status: 'pending_review' },
    });
    expect(db.row('users', USER)).toMatchObject({
      authUserId: USER,
      status: 'pending_review',
      $permissions: [`read("user:${USER}")`],
    });
    expect(db.row('users', 'another-user')).toBeUndefined();
    const row = db.row('platform_settings', approvalRowId(USER));
    expect(row).toMatchObject({ public: false, $permissions: [`read("user:${USER}")`] });
    expect(parseApprovalRecord(row, USER)).toMatchObject({
      userId: USER,
      status: 'pending_review',
    });
    expect(db.rows('audit_logs')).toHaveLength(1);
  });

  it.each(['active', 'rejected', 'suspended'])(
    'preserva decisão/status existente %s sem reabertura',
    async (status) => {
      const db = memory({ users: [user(status)] });
      const before = db.row('users', USER);
      expect(await ensureCreatorApplication(context(db), request)).toMatchObject({
        ok: true,
        value: { status: accountApprovalStatus(status) },
      });
      expect(db.row('users', USER)).toEqual(before);
      expect(db.rows('platform_settings')).toHaveLength(0);
      expect(db.rows('audit_logs')).toHaveLength(0);
    },
  );

  it('é idempotente e recusa consentimento manipulado ou dono divergente', async () => {
    const db = memory();
    expect(
      await ensureCreatorApplication(context(db), { ...request, consentVersion: 'forged' }),
    ).toMatchObject({ ok: false, failure: { code: 'invalid' } });
    await ensureCreatorApplication(context(db), request);
    await ensureCreatorApplication(context(db), request);
    expect(db.rows('audit_logs')).toHaveLength(1);
    const wrongOwner = memory({ users: [{ ...user(), authUserId: 'another-user' }] });
    expect(await ensureCreatorApplication(context(wrongOwner), request)).toMatchObject({
      ok: false,
      failure: { code: 'forbidden' },
    });
  });
});

describe('decisão administrativa de cadastro', () => {
  it.each([{ roles: [] }, { roles: ['moderator'] }, { roles: ['fulfillment'] }] as {
    roles: CoreContext['actor']['roles'];
  }[])('nega aprovação ou listagem sem capability administrativa %j', async ({ roles }) => {
    const db = memory({ users: [user()], profiles: [profile()] });
    expect(
      await reviewCreatorApplication(context(db, roles), {
        userId: USER,
        decision: 'approve',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: false, failure: { code: 'forbidden' } });
    expect(
      await loadCreatorApplications(context(db, roles), { status: 'pending_review' }),
    ).toMatchObject({ ok: false, failure: { code: 'forbidden' } });
    expect(db.row('users', USER)?.status).toBe('pending_review');
  });

  it('aprova perfil concluído e registra decisão/ator de forma atômica', async () => {
    const db = memory({
      users: [user()],
      profiles: [profile()],
      platform_settings: [application()],
    });
    const admin = context(db, ['admin'], 'admin-1');
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'approve',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: true, value: { userId: USER, status: 'active' } });
    expect(db.row('users', USER)?.status).toBe('active');
    expect(
      parseApprovalRecord(db.row('platform_settings', approvalRowId(USER)), USER),
    ).toMatchObject({
      status: 'active',
      reviewedBy: 'admin-1',
      reviewedAt: admin.now.toISOString(),
    });
    expect(db.rows('audit_logs')).toMatchObject([
      { action: 'creator.application_approved', actorId: 'admin-1' },
    ]);
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'reject',
        reason: 'Dados incompletos',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: false, failure: { code: 'conflict' } });
  });

  it('recusa com motivo obrigatório e permite corrigir uma recusa pela equipe', async () => {
    const db = memory({ users: [user()], profiles: [profile()] });
    const admin = context(db, ['admin'], 'admin-1');
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'reject',
        reason: ' ',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: false, failure: { code: 'invalid' } });
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'reject',
        reason: 'O perfil informado não pôde ser confirmado.',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: true, value: { status: 'rejected' } });
    expect(
      parseApprovalRecord(db.row('platform_settings', approvalRowId(USER)), USER)?.reason,
    ).toBe('O perfil informado não pôde ser confirmado.');
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'approve',
        expectedStatus: 'rejected',
      }),
    ).toMatchObject({ ok: true, value: { status: 'active' } });
    expect(db.rows('audit_logs')).toHaveLength(2);
  });

  it('não aprova perfil incompleto nem publica decisão quando o commit perde conflito', async () => {
    const db = memory({ users: [user()] });
    const admin = context(db, ['admin'], 'admin-1');
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'approve',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: false, failure: { code: 'invalid' } });
    db.failCommit();
    expect(
      await reviewCreatorApplication(admin, {
        userId: USER,
        decision: 'reject',
        reason: 'Dados incompletos.',
        expectedStatus: 'pending_review',
      }),
    ).toMatchObject({ ok: false, failure: { code: 'conflict' } });
    expect(db.row('users', USER)?.status).toBe('pending_review');
    expect(db.rows('platform_settings')).toHaveLength(0);
    expect(db.rows('audit_logs')).toHaveLength(0);
  });
});

describe('fila administrativa e origem do estado', () => {
  it('usa users.status, inclui dados declarados e ignora contas ativas legadas', async () => {
    const db = memory({
      users: [user(), user('active', 'legacy')],
      profiles: [profile(), profile('legacy')],
      platform_settings: [application(USER, 'active')],
      social_accounts: [
        {
          $id: 'social-1',
          userId: USER,
          platform: 'instagram',
          canonicalUrl: 'https://instagram.com/ana',
          verificationStatus: 'unverified',
        },
        { $id: 'social-2', userId: 'someone-else', platform: 'instagram', canonicalUrl: 'private' },
      ],
    });
    const admin = context(db, ['admin'], 'admin-1');
    const result = await loadCreatorApplications(admin, { status: 'pending_review' });
    expect(result).toMatchObject({
      ok: true,
      value: {
        items: [
          {
            userId: USER,
            status: 'pending_review',
            profile: { name: 'Ana Creator' },
            socials: [{ canonicalUrl: 'https://instagram.com/ana' }],
          },
        ],
        nextCursor: null,
      },
    });
    expect(await loadCreatorApplications(admin, { status: 'active' })).toMatchObject({
      ok: true,
      value: { items: [] },
    });
  });

  it('pagina por cursor sem perder solicitações após a primeira página', async () => {
    const users = Array.from({ length: 73 }, (_, i) =>
      user('pending_review', `creator-${String(i).padStart(3, '0')}`),
    );
    const db = memory({ users });
    const admin = context(db, ['admin'], 'admin-1');
    const first = await loadCreatorApplications(admin, { status: 'pending_review' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.items).toHaveLength(50);
    expect(first.value.nextCursor).toBe('creator-049');
    const second = await loadCreatorApplications(admin, {
      status: 'pending_review',
      cursor: first.value.nextCursor,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.items).toHaveLength(23);
    expect(second.value.items[0].userId).toBe('creator-050');
    expect(second.value.nextCursor).toBeNull();
  });

  it('não lê metadata pública ou de outra identidade como aprovação', () => {
    expect(parseApprovalRecord({ ...application(), public: true }, USER)).toBeNull();
    expect(parseApprovalRecord(application('another-user'), USER)).toBeNull();
    expect(accountApprovalStatus('approved-from-prefs')).toBe('unavailable');
    expect(approvalRowId(USER)).toHaveLength(36);
  });

  it('expõe continuação mesmo quando o teto da varredura ainda não alcançou um pedido', async () => {
    const users = Array.from({ length: 1000 }, (_, i) =>
      user('active', `legacy-${String(i).padStart(4, '0')}`),
    );
    users.push(user('pending_review', 'new-application'));
    const db = memory({ users });
    const admin = context(db, ['admin'], 'admin-1');
    const first = await loadCreatorApplications(admin, { status: 'pending_review' });
    expect(first).toMatchObject({
      ok: true,
      value: { items: [], scanned: 1000, nextCursor: 'legacy-0999' },
    });
    if (!first.ok) return;
    const second = await loadCreatorApplications(admin, {
      status: 'pending_review',
      cursor: first.value.nextCursor,
    });
    expect(second).toMatchObject({
      ok: true,
      value: { items: [{ userId: 'new-application' }], nextCursor: null },
    });
  });
});
