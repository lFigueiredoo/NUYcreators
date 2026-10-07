import { describe, expect, it } from 'vitest';
import { adminOverview, adminReport, type ReportSummary } from '../../src/features/workspace/core';
import type { CoreContext } from '../../src/features/workspace/core/context';
import { confirmedRoles, hasCapability, ownTeamRoles } from '../../src/lib/security/memberships';
import { adminCapabilities, roleAllows, type AdminRole } from '../../src/lib/security/permissions';
import {
  REQUIREMENT_LIMIT,
  campaignIssues,
  catalogStatuses,
  catalogStatusView,
  catalogView,
  challengeIssues,
  isLive,
  isVisibleToCreators,
  rewardIssues,
  wallClockValue,
  type CampaignDraft,
  type ChallengeDraft,
  type RewardDraft,
} from '../../src/features/workspace/domain/catalog';

/**
 * Administração: quem pode, o que o catálogo aceita e o que o relatório soma.
 *
 * Três coisas que a área administrativa promete e que ninguém vê acontecer no
 * dia a dia — até o dia em que falham:
 *
 *  1. papel só vem de membership CONFIRMADA, e a apuração por sessão não afrouxa
 *     quando a listagem não veio filtrada (o erro clássico aqui é dar admin a
 *     quem não tem porque "só tem uma linha do time");
 *  2. o catálogo não inventa estado: são os três que a operação distingue, e
 *     rascunho fica fora do que a creator vê;
 *  3. o resumo do período conta o PERÍODO — se um filtro de data for esquecido,
 *     o número vira "desde sempre" com cara de "últimos 30 dias".
 *
 * O `TablesDB` aqui é um dublê em memória que entende as três operações de query
 * que estas leituras usam (`equal`, `isNotNull`, `greaterThanEqual`). Não é
 * mock de negócio: é o banco no seu comportamento mais básico, para que o teste
 * possa provar que o filtro FOI aplicado.
 */

type Row = Record<string, unknown>;
type Query = { method: string; attribute?: string; values?: unknown[] };

/** Banco mínimo: filtra o que o núcleo pediu e devolve `total` como a API real. */
function memoryTables(tables: Record<string, Row[]>) {
  return {
    listRows: async ({ tableId, queries }: { tableId: string; queries?: string[] }) => {
      const parsed = (queries ?? []).map((query) => JSON.parse(query) as Query);
      const limit = parsed.find((query) => query.method === 'limit')?.values?.[0] as
        number | undefined;
      const offset =
        (parsed.find((query) => query.method === 'offset')?.values?.[0] as number) ?? 0;
      const filtered = (tables[tableId] ?? []).filter((row) =>
        parsed.every((query) => {
          const value = query.attribute ? row[query.attribute] : undefined;
          if (query.method === 'equal') return (query.values ?? []).includes(value);
          if (query.method === 'isNotNull') return value !== undefined && value !== null;
          if (query.method === 'greaterThanEqual')
            return typeof value === 'string' && value >= String(query.values?.[0]);
          return true;
        }),
      );
      return { total: filtered.length, rows: filtered.slice(offset, offset + (limit ?? 100)) };
    },
  } as never;
}

const NOW = new Date('2026-10-07T15:00:00.000Z');
/** `AAAA-MM-DD` deslocado em dias a partir de agora — legível na asserção. */
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function context(
  tables: Record<string, Row[]>,
  roles: AdminRole[] = ['admin'],
  userId = 'staff',
): CoreContext {
  return {
    tables: memoryTables(tables),
    databaseId: 'nuy-creators',
    actor: { userId, roles },
    now: NOW,
    correlationId: 'unit',
  };
}

describe('autorização da administração', () => {
  it('nega antes de qualquer leitura: sem sessão é 401, sem papel é 403', async () => {
    const anonymous = await adminReport(context({}, [], ''));
    const creator = await adminReport(context({}, [], 'creator-1'));
    expect(anonymous).toMatchObject({
      ok: false,
      failure: { code: 'unauthenticated', status: 401 },
    });
    expect(creator).toMatchObject({ ok: false, failure: { code: 'forbidden', status: 403 } });
    // Nem uma leitura foi tentada: a recusa acontece antes do banco.
    expect(await adminReport(context({}, ['moderator']))).toMatchObject({
      ok: false,
      failure: { code: 'forbidden' },
    });
  });

  it('separa as capacidades por papel: moderar não administra catálogo', () => {
    expect(roleAllows('moderator', 'moderate')).toBe(true);
    expect(roleAllows('moderator', 'manage-catalog')).toBe(false);
    expect(roleAllows('moderator', 'view-audit')).toBe(false);
    expect(roleAllows('moderator', 'adjust-points')).toBe(false);
    expect(roleAllows('fulfillment', 'fulfill')).toBe(true);
    expect(roleAllows('fulfillment', 'moderate')).toBe(false);
    // `admin` é o único que acumula as cinco — é a conta humana que opera tudo.
    expect(Object.keys(adminCapabilities)).toEqual(['admin', 'moderator', 'fulfillment']);
    expect(adminCapabilities.admin).toHaveLength(5);
    expect(hasCapability(['moderator'], 'view-audit')).toBe(false);
    expect(hasCapability(['moderator', 'admin'], 'view-audit')).toBe(true);
  });

  it('apuração por SESSÃO: listagem não filtrada, identidade divergente ou membership não confirmada não valem papel', () => {
    const own = { userId: 'staff', teamId: 'nuy-admins', confirm: true, roles: ['admin'] };
    expect(ownTeamRoles([own], 'staff', 'nuy-admins')).toEqual(['admin']);
    // Duas linhas do time = o filtro por identidade não foi aplicado (a listagem
    // de sessão redige a identidade, então não dá para saber de quem é cada uma).
    expect(
      ownTeamRoles(
        [own, { userId: '', teamId: 'nuy-admins', confirm: true, roles: ['admin'] }],
        'staff',
        'nuy-admins',
      ),
    ).toEqual([]);
    // A linha é de outro: a plataforma devolveu a membership errada.
    expect(ownTeamRoles([{ ...own, userId: 'outra' }], 'staff', 'nuy-admins')).toEqual([]);
    // Membership criada e não confirmada não confere privilégio nenhum.
    expect(ownTeamRoles([{ ...own, confirm: false }], 'staff', 'nuy-admins')).toEqual([]);
    // Time diferente do configurado: fora.
    expect(ownTeamRoles([{ ...own, teamId: 'outro-time' }], 'staff', 'nuy-admins')).toEqual([]);
    // Papel fora do vocabulário não vira capacidade.
    expect(ownTeamRoles([{ ...own, roles: ['owner', 'editor'] }], 'staff', 'nuy-admins')).toEqual(
      [],
    );
  });

  it('apuração por CHAVE exige a identidade na própria linha', () => {
    const rows = [
      { userId: 'staff', teamId: 'nuy-admins', confirm: true, roles: ['moderator'] },
      { userId: 'outra', teamId: 'nuy-admins', confirm: true, roles: ['admin'] },
      { userId: 'staff', teamId: 'nuy-admins', confirm: false, roles: ['admin'] },
    ];
    expect(confirmedRoles(rows, 'staff', 'nuy-admins')).toEqual(['moderator']);
  });
});

describe('ciclo de vida do catálogo', () => {
  it('são três estados, e nenhum deles é inventado', () => {
    expect(catalogStatuses).toEqual(['draft', 'published', 'closed']);
    // `active` é palavra JÁ publicada no catálogo: continua sendo lida como "no
    // ar", mas não é um estado que a operação possa escolher.
    expect(catalogStatuses).not.toContain('active');
    expect(isLive('active')).toBe(true);
    expect(isLive('published')).toBe(true);
    expect(isLive('draft')).toBe(false);
    expect(isLive('closed')).toBe(false);
  });

  it('todo estado tem rótulo, tom e explicação', () => {
    for (const status of catalogStatuses)
      expect(catalogStatusView[status]).toMatchObject({
        label: expect.any(String),
        tone: expect.any(String),
        hint: expect.any(String),
      });
  });

  it('rascunho não é catálogo; encerrado continua visível para quem já participou', () => {
    expect(isVisibleToCreators('draft')).toBe(false);
    expect(isVisibleToCreators('published')).toBe(true);
    expect(isVisibleToCreators('active')).toBe(true);
    expect(isVisibleToCreators('closed')).toBe(true);
  });

  it('estado desconhecido aparece cru — nunca traduzido no chute', () => {
    expect(catalogView('active').label).toBe('Publicado');
    expect(catalogView('arquivado')).toMatchObject({ label: 'arquivado', hint: '' });
    expect(catalogView('')).toMatchObject({ label: 'Sem estado' });
    expect(catalogView(null).label).toBe('Sem estado');
  });

  it('devolve o instante gravado para a hora de parede do produto', () => {
    // 17:00Z é 14:00 em São Paulo: reabrir o editor mostra o que foi digitado.
    expect(wallClockValue('2026-10-06T17:00:00.000Z', 'America/Sao_Paulo')).toBe(
      '2026-10-06T14:00',
    );
    expect(wallClockValue(null, 'America/Sao_Paulo')).toBe('');
    expect(wallClockValue('nem data', 'America/Sao_Paulo')).toBe('');
  });
});

describe('validação dos rascunhos do catálogo', () => {
  const challenge: ChallengeDraft = {
    slug: 'reels-de-verao',
    name: 'Reels de verão',
    description: 'Grave um reel de 60 segundos com as hashtags do desafio.',
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
  };
  const reward: RewardDraft = {
    name: 'Kit de câmera',
    type: 'produto físico',
    description: 'Enviado para o endereço cadastrado em até 15 dias.',
    pointsCost: 250,
    stock: 3,
    perUserLimit: 1,
    startsAt: '2026-10-01T09:00',
    endsAt: '2026-11-01T23:59',
    imageFileId: '',
  };
  const campaign: CampaignDraft = {
    name: 'Volta às aulas',
    description: 'Campanha de outubro, com desafio e recompensa próprios.',
    startsAt: '2026-10-01T09:00',
    endsAt: '2026-11-01T23:59',
    status: 'draft',
  };

  it('aceita o rascunho inteiro', () => {
    expect(challengeIssues(challenge)).toEqual([]);
    expect(rewardIssues(reward)).toEqual([]);
    expect(campaignIssues(campaign)).toEqual([]);
  });

  it('recusa o que o schema não aceita, com uma frase por problema', () => {
    expect(challengeIssues({ ...challenge, slug: 'Reels de Verão' })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, name: 'x' })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, points: -1 })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, participantLimit: 0 })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, participantLimit: 10 })).toEqual([]);
    expect(challengeIssues({ ...challenge, endsAt: challenge.startsAt })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, startsAt: '' })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, platform: '  ' })).toHaveLength(1);
    // Identificador de linha tem teto e vocabulário: hífen de id do Appwrite vale,
    // espaço e acento não.
    expect(challengeIssues({ ...challenge, campaignId: 'uma campanha' })).toHaveLength(1);
    expect(challengeIssues({ ...challenge, campaignId: '68ac1ed7-0b7' })).toEqual([]);
  });

  it('a configuração do requisito é JSON de objeto — ou não entra', () => {
    const issuesFor = (configJson: string) =>
      challengeIssues({
        ...challenge,
        requirements: [{ type: 'link', required: true, configJson }],
      });
    expect(issuesFor('')).toEqual([]);
    expect(issuesFor('{"value":"#nuycreators"}')).toEqual([]);
    expect(issuesFor('["#nuycreators"]')).toHaveLength(1);
    expect(issuesFor('{"value":')).toHaveLength(1);
    const many = Array.from({ length: REQUIREMENT_LIMIT + 1 }, () => ({
      type: 'link',
      required: true,
      configJson: '',
    }));
    expect(challengeIssues({ ...challenge, requirements: many })).toHaveLength(1);
  });

  it('recompensa: estoque e limite por creator são números de gente', () => {
    expect(rewardIssues({ ...reward, stock: -1 })).toHaveLength(1);
    expect(rewardIssues({ ...reward, perUserLimit: 0 })).toHaveLength(1);
    expect(rewardIssues({ ...reward, pointsCost: 12.5 })).toHaveLength(1);
    expect(rewardIssues({ ...reward, type: '' })).toHaveLength(1);
    expect(rewardIssues({ ...reward, endsAt: '2026-09-01T09:00' })).toHaveLength(1);
  });

  it('campanha: só os três estados do catálogo', () => {
    // O formulário manda STRING; o tipo do domínio é o que a tela promete, não o
    // que chega. Um estado fora do vocabulário tem que morrer na validação.
    const submitted = (status: string): CampaignDraft => ({
      ...campaign,
      status: status as CampaignDraft['status'],
    });
    expect(campaignIssues(submitted('active'))).toHaveLength(1);
    expect(campaignIssues(submitted('arquivada'))).toHaveLength(1);
    expect(campaignIssues(submitted('closed'))).toEqual([]);
  });
});

describe('resumo do período', () => {
  /** Um banco com movimento em dois períodos: o de dentro e o de fora. */
  const movement = {
    profiles: [
      { $id: 'c1', onboardingCompletedAt: ago(20) },
      { $id: 'c2', onboardingCompletedAt: ago(2) },
      { $id: 'c3', onboardingCompletedAt: ago(200) },
    ],
    challenges: [
      { $id: 'd1', status: 'published', startsAt: ago(10) },
      { $id: 'd2', status: 'closed', startsAt: ago(120) },
      { $id: 'd3', status: 'draft', startsAt: ago(120) },
    ],
    challenge_participants: [
      { $id: 'p1', joinedAt: ago(9) },
      { $id: 'p2', joinedAt: ago(300) },
    ],
    challenge_submissions: [
      { $id: 's1', status: 'approved', userId: 'c1', submittedAt: ago(3) },
      { $id: 's2', status: 'approved', userId: 'c2', submittedAt: ago(3) },
      { $id: 's3', status: 'rejected', userId: 'c1', submittedAt: ago(9) },
      { $id: 's4', status: 'pending', userId: 'c2', submittedAt: ago(20) },
      { $id: 's5', status: 'pending', userId: 'c2', submittedAt: ago(120) },
    ],
    point_transactions: [
      { $id: 't1', amount: 800, createdAt: ago(3) },
      { $id: 't2', amount: 200, createdAt: ago(3) },
      { $id: 't3', amount: -250, createdAt: ago(1) },
      { $id: 't4', amount: 5000, createdAt: ago(120) },
    ],
    reward_redemptions: [
      { $id: 'r1', status: 'requested', requestedAt: ago(2) },
      { $id: 'r2', status: 'delivered', requestedAt: ago(5) },
      { $id: 'r3', status: 'requested', requestedAt: ago(90) },
    ],
    rewards: [
      { $id: 'w1', status: 'published' },
      { $id: 'w2', status: 'draft' },
    ],
    campaigns: [{ $id: 'k1' }, { $id: 'k2' }],
  };

  function report(tables: Record<string, Row[]>, days = 30) {
    return adminReport(context(tables), { days });
  }

  it('conta o período, não o acervo: o que ficou fora da janela não entra', async () => {
    const result = await report(movement);
    expect(result.ok).toBe(true);
    const summary = (result as { value: ReportSummary }).value;

    expect(summary.days).toBe(30);
    expect(summary.from).toBe(ago(30));
    // Duas creators concluíram onboarding na janela; a terceira é de janeiro e
    // continua contando no TOTAL — são dois números, dois significados.
    expect(summary.creators).toEqual({ total: 3, onboardedInPeriod: 2 });
    expect(summary.challenges).toEqual({ live: 1, startedInPeriod: 1, closed: 1 });
    expect(summary.participations).toEqual({ inPeriod: 1 });
    expect(summary.redemptions.inPeriod).toBe(2);
    // Saldo do período: o crédito de 5.000 de quatro meses atrás NÃO entra.
    expect(summary.points).toEqual({ granted: 1000, redeemed: 250, truncated: false });
  });

  it('a taxa de aprovação é sobre o que foi decidido — e é nula quando nada foi', async () => {
    const result = await report(movement);
    const summary = (result as { value: ReportSummary }).value;
    expect(summary.submissions).toEqual({
      inPeriod: 4,
      approved: 2,
      rejected: 1,
      pending: 1,
      revisionRequested: 0,
      sampleTruncated: false,
    });
    expect(summary.approvalRate).toBeCloseTo(2 / 3, 10);
    // Quem enviou é contado por identidade distinta, não por número de envios.
    expect(summary.activeCreators.total).toBe(2);

    const noneDecided = await report({
      ...movement,
      challenge_submissions: [{ $id: 's1', status: 'pending', userId: 'c1', submittedAt: ago(1) }],
    });
    expect((noneDecided as { value: ReportSummary }).value.approvalRate).toBeNull();
  });

  it('as semanas fecham a série na mais recente — a ordem é a do tempo', async () => {
    const result = await report(movement);
    const summary = (result as { value: ReportSummary }).value;
    expect(summary.weeks).toEqual([
      { label: '28–35 dias atrás', submissions: 0 },
      { label: '21–28 dias atrás', submissions: 0 },
      { label: '14–21 dias atrás', submissions: 1 },
      { label: '7–14 dias atrás', submissions: 1 },
      { label: 'Últimos 7 dias', submissions: 2 },
    ]);
    // O rótulo da última é o que a tela usa para dizer "esta é a de agora".
    expect(summary.weeks.at(-1)?.label).toBe('Últimos 7 dias');
  });

  it('período "tudo" não tem filtro de data — e diz isso', async () => {
    const result = await report(movement, 0);
    const summary = (result as { value: ReportSummary }).value;
    expect(summary.days).toBe(0);
    expect(summary.from).toBe('');
    expect(summary.submissions.inPeriod).toBe(5);
    expect(summary.points.granted).toBe(6000);
  });

  it('a visão geral é do ACERVO, não do período: a fila pendente é o que espera agora', async () => {
    const result = await adminOverview(context(movement));
    expect(result.ok).toBe(true);
    expect((result as { value: Record<string, number> }).value).toEqual({
      challengesLive: 1,
      challengesDraft: 1,
      challengesClosed: 1,
      // Os dois pendentes, inclusive o de quatro meses atrás: um envio que nunca
      // foi decidido continua esperando a equipe — filtrar por período esconderia
      // trabalho aberto.
      submissionsPending: 2,
      submissionsRevision: 0,
      creators: 3,
      rewardsLive: 1,
      rewardsDraft: 1,
      redemptionsRequested: 2,
      redemptionsProcessing: 0,
      campaigns: 2,
    });
  });
});
