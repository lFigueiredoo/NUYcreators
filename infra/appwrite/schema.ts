/**
 * Manifesto do NUY Creators em vocabulário TablesDB (Appwrite 2.x).
 *
 * `table` é o que era collection, `column` é o que era attribute. Os IDs não
 * mudaram: os mesmos recursos, com os mesmos nomes, para que o domínio e a
 * camada de persistência continuem falando dos mesmos objetos de negócio.
 *
 * LIMITE MEDIDO DA PLATAFORMA (não é preferência nossa): o Appwrite recusa a
 * table quando a soma dos tamanhos `varchar` passa de ~16 KB
 * (`400 column_limit_exceeded`), e uma coluna sozinha vai no máximo até 16.381
 * caracteres. Medido em staging, coluna a coluna, e reproduzido pelo teste
 * `infrastructure.test.ts`.
 *
 * Consequência, e o único ponto em que o mapa atributo→coluna NÃO é 1:1:
 * `audit_logs` pedia `beforeJson` + `afterJson` (10.000 cada) junto das demais
 * colunas, e não cabe. Os dois snapshots passaram a viver em
 * `audit_log_snapshots`, uma linha por lado, com a MESMA capacidade de 10.000
 * caracteres por payload — nada foi truncado, encurtado ou descartado. O
 * adaptador (`src/lib/appwrite/data`) recompõe `beforeJson`/`afterJson` para o
 * domínio, então quem lê auditoria continua vendo o mesmo objeto.
 */
import { ProjectKeyScopes } from 'node-appwrite';

export type ColumnType = 'varchar' | 'integer' | 'boolean' | 'datetime';
export type Column = {
  key: string;
  type: ColumnType;
  required: boolean;
  /** Tamanho em caracteres, só para `varchar`. */
  size?: number;
};
export type Table = {
  id: string;
  columns: Column[];
  unique: string[][];
  indexes: string[][];
};
// ? optional, # integer, ! boolean, @ datetime. Strings default to 255 chars.
function table(
  id: string,
  fields: string,
  unique: string[][] = [],
  indexes: string[][] = [],
): Table {
  const columns = fields.split(' ').map((field): Column => {
    const required = !field.endsWith('?');
    const clean = field.replace(/\?$/, '');
    const [key, marker] = clean.split(':');
    return {
      key,
      required,
      type:
        marker === '#'
          ? 'integer'
          : marker === '!'
            ? 'boolean'
            : marker === '@'
              ? 'datetime'
              : 'varchar',
      size: marker && /^\d+$/.test(marker) ? Number(marker) : 255,
    };
  });
  return { id, columns, unique, indexes };
}
export const schemaVersion = '001';
export const tables: Table[] = [
  table('users', 'authUserId status acceptedTermsVersion consentAt:@', [['authUserId']]),
  table(
    'profiles',
    'userId name avatarFileId? phone city state birthDate niche creatorType onboardingCompletedAt:@ publicProfile:!',
    [['userId']],
  ),
  table(
    'social_accounts',
    'userId platform handle? canonicalUrl:2048 externalAccountId? verificationStatus',
    [['userId', 'platform']],
    [['externalAccountId', 'platform']],
  ),
  table(
    'creator_levels',
    'name minPoints:# maxPoints:#? order:# active:! rulesVersion',
    [['order']],
    [['active', 'order']],
  ),
  table(
    'challenges',
    'slug name description:10000 imageFileId? platform startsAt:@ endsAt:@ points:# requiredLevelId? participantLimit:#? participantCount:# productId? hashtags:2000? mentions:2000? status campaignId? version:#',
    [['slug']],
    [['status', 'startsAt'], ['campaignId']],
  ),
  table(
    'challenge_requirements',
    'challengeId type configJson:10000 order:# required:!',
    [],
    [['challengeId', 'order']],
  ),
  table(
    'challenge_participants',
    'challengeId userId joinedAt:@ status',
    [['challengeId', 'userId']],
    [['userId', 'joinedAt']],
  ),
  table(
    'challenge_submissions',
    'challengeId participantId userId platform canonicalUrl:2048? contentFingerprint fileId? status revision:# submittedAt:@ reviewedBy? reviewedAt:@? moderationReason:2000?',
    [['contentFingerprint']],
    [
      ['userId', 'submittedAt'],
      ['status', 'submittedAt'],
    ],
  ),
  table(
    'point_transactions',
    'userId type amount:# referenceId referenceType description:2000 createdAt:@ idempotencyKey rankingDelta:# actorId reversalOf?',
    [['idempotencyKey']],
    [
      ['userId', 'createdAt'],
      ['referenceType', 'referenceId'],
    ],
  ),
  table(
    'rewards',
    'name type imageFileId? description:10000 pointsCost:# stock:# perUserLimit:# startsAt:@ endsAt:@ status version:#',
    [],
    [['status', 'startsAt']],
  ),
  table(
    'reward_redemptions',
    'userId rewardId pointsCostSnapshot:# rewardSnapshotJson:10000 status idempotencyKey requestedAt:@ shippingAddressId? trackingCode? stockRestoredAt:@? refundedAt:@?',
    [['idempotencyKey']],
    [
      ['userId', 'requestedAt'],
      ['status', 'requestedAt'],
    ],
  ),
  table(
    'content_posts',
    'submissionId creatorId caption:5000 publicMediaFileId? categoryIds:2000? productId? publishedAt:@ status',
    [['submissionId']],
    [['status', 'publishedAt'], ['creatorId']],
  ),
  table('content_likes', 'postId userId', [['postId', 'userId']]),
  table('content_saves', 'postId userId', [['postId', 'userId']]),
  table('badges', 'code name description:2000 imageFileId? ruleJson:5000 active:!', [['code']]),
  table('user_badges', 'userId badgeId awardedAt:@ referenceId periodKey', [
    ['userId', 'badgeId', 'periodKey'],
  ]),
  table(
    'notifications',
    'userId type title body:2000 referenceId? readAt:@? eventKey',
    [['eventKey', 'userId']],
    [['userId', '$createdAt']],
  ),
  table(
    'campaigns',
    'name description:10000 startsAt:@ endsAt:@ status',
    [],
    [['status', 'startsAt']],
  ),
  table(
    'audit_logs',
    'actorId action entityType entityId affectedUserId? reason:2000 occurredAt:@ ip? correlationId',
    [],
    [
      ['entityType', 'entityId'],
      ['actorId', 'occurredAt'],
    ],
  ),
  // Snapshots da auditoria, fora de `audit_logs` por limite de tamanho da
  // table (ver o cabeçalho). Uma linha por lado; o par (auditLogId, side) é
  // único, então reexecutar a mesma ação não duplica snapshot.
  table('audit_log_snapshots', 'auditLogId side payloadJson:10000 occurredAt:@', [
    ['auditLogId', 'side'],
  ]),
  table(
    'point_accounts',
    'userId availableBalance:# qualifyingPoints:# levelId? version:# lastTransactionId?',
    [['userId']],
  ),
  table(
    'ranking_entries',
    'periodKey userId earnedPoints:# lastEarnedAt:@',
    [['periodKey', 'userId']],
    [['periodKey', 'earnedPoints']],
  ),
  table(
    'submission_history',
    'submissionId revision:# previousStatus? nextStatus actorId reason:2000? payloadSnapshotJson:10000 occurredAt:@',
    [],
    [['submissionId', 'occurredAt']],
  ),
  table(
    'redemption_history',
    'redemptionId previousStatus? nextStatus actorId reason:2000? occurredAt:@',
    [],
    [['redemptionId', 'occurredAt']],
  ),
  table('operation_keys', 'actorId operation key requestHash resultId? status', [
    ['actorId', 'operation', 'key'],
  ]),
  table(
    'outbox_events',
    'eventKey type aggregateId payloadJson:10000 status attempts:# nextAttemptAt:@',
    [['eventKey']],
    [['status', 'nextAttemptAt']],
  ),
  table(
    'public_creator_profiles',
    'userId displayName publicAvatarId? bio:2000? approvedSocialUrls:5000?',
    [['userId']],
  ),
  table(
    'shipping_addresses',
    'userId recipient street number complement? district city state postalCode country',
    [],
    [['userId']],
  ),
  table('products', 'slug name description:5000? imageFileId? status', [['slug']]),
  table('content_categories', 'slug name active:!', [['slug']]),
  table('platform_settings', 'key valueJson:10000 public:!', [['key']]),
];
export const buckets = [
  {
    id: 'brand-assets',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'],
    size: 10_000_000,
  },
  {
    id: 'submission-media',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    size: 25_000_000,
  },
  { id: 'community-media', extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4'], size: 25_000_000 },
  { id: 'avatars', extensions: ['jpg', 'jpeg', 'png', 'webp'], size: 5_000_000 },
];
/** Nome do banco no Console. O id vem do ambiente (`APPWRITE_DATABASE_ID`). */
export const databaseName = 'NUY Creators';
export const team = { id: 'nuy-admins', roles: ['admin', 'moderator', 'fulfillment'] };
/**
 * Funções do núcleo operacional. `implemented: true` significa que o código
 * existe no repositório e é empacotado por `scripts/build-functions.mjs` — e só
 * foi marcado assim depois do fluxo correspondente passar contra o staging real
 * (tests/integration/core.test.ts). O container continua desabilitado e sem
 * papel de execução: publicar é decisão de deploy, não consequência do código.
 */
/**
 * QUEM pode executar cada function pelo cliente — o campo `execute` do Appwrite.
 *
 *  `users`  — qualquer pessoa autenticada. Só nas entradas em que a criadora age
 *             sobre a PRÓPRIA identidade: entrar em desafio, enviar conteúdo,
 *             resgatar recompensa. A identidade vem do JWT que a plataforma
 *             injeta na execução por sessão (medido: `x-appwrite-user-jwt` de
 *             188 caracteres + `x-appwrite-user-id`); nenhuma entrada lê
 *             `userId` de payload.
 *  `admins` — só membership CONFIRMADA na equipe administrativa: moderação,
 *             ajuste de pontos e as tarefas de catálogo. O papel é apurado
 *             DENTRO da function (nunca vem do payload), o que exige
 *             `teams.read` na chave dinâmica — medido: sem esse escopo a leitura
 *             de equipe responde 401 `general_unauthorized_scope` e todo comando
 *             de equipe cairia em `forbidden`.
 *  `closed` — ninguém pelo cliente. Só chave de servidor e agendamento.
 *
 * Execução AGENDADA não passa por `execute` (medido: o agendamento rodou com
 * `execute=['users']` e chega com `x-appwrite-trigger: schedule`), e é assim que
 * a fila de eventos anda sem ninguém clicando.
 */
export type FunctionAudience = 'users' | 'admins' | 'closed';

export type FunctionDefinition = {
  id: string;
  implemented: boolean;
  audience: FunctionAudience;
  /** A entrada apura papel de equipe: exige `teams.read` na chave dinâmica. */
  readsTeams: boolean;
  /** Agenda do Appwrite (cron). Só onde o trabalho precisa andar sozinho. */
  schedule?: string;
};

export const functionDefinitions: FunctionDefinition[] = [
  // ABERTA no Sprint 8, e a ordem em que isso aconteceu é a decisão: a function
  // foi publicada e PROVADA pelo runtime (autorização, idempotência, integração e
  // E2E) ANTES de `APPWRITE_FUNCTIONS_ENABLED` ser ligada. Declarar aberta sem
  // prova seria declarar pronta; ligar a flag antes de publicar travaria o produto
  // na porta de entrada (§ armadilha abaixo).
  //
  // AUDIENCE `users`, nunca `any`: a function só é utilizável por quem tem sessão
  // — a identidade vem do JWT e sai de `Account.get()`, e e-mail não verificado é
  // recusado antes de qualquer escrita. `any` não acrescentaria ninguém capaz de
  // usá-la; só alargaria a superfície. É a regra mínima que atende o caso.
  //
  // A ARMADILHA do Sprint 7, agora desarmada — registrada porque continua
  // valendo para quem mexer aqui depois: a MESMA flag abre esta porta e a do
  // núcleo operacional (`join-challenge`, `submit-content`, `redeem-reward`).
  // Com o formulário acionável e esta function fechada, a creator cadastrada não
  // sai do onboarding (a recusa é permanente, não indisponibilidade passageira) e
  // o produto fica travado na entrada. Publicar ANTES de ligar a flag, sempre.
  { id: 'complete-onboarding', implemented: true, audience: 'users', readsTeams: false },
  { id: 'join-challenge', implemented: true, audience: 'users', readsTeams: false },
  { id: 'submit-content', implemented: true, audience: 'users', readsTeams: false },
  { id: 'redeem-reward', implemented: true, audience: 'users', readsTeams: false },
  { id: 'moderate-submission', implemented: true, audience: 'admins', readsTeams: true },
  {
    id: 'admin-console',
    implemented: true,
    audience: 'admins',
    // Lê `teams.read` para apurar a capacidade de quem chama (manage-catalog,
    // moderate, view-audit) — a mesma porta fechada da moderação.
    readsTeams: true,
  },
  { id: 'adjust-points', implemented: true, audience: 'admins', readsTeams: true },
  { id: 'rebuild-ranking', implemented: true, audience: 'admins', readsTeams: true },
  {
    id: 'process-outbox',
    implemented: true,
    audience: 'admins',
    readsTeams: true,
    // O evento vira notificação só quando a fila é drenada. Sem agenda, a
    // criadora entra no desafio e não recebe aviso nenhum.
    schedule: '*/5 * * * *',
  },
];

/**
 * Papéis de `execute` no vocabulário do Appwrite. A equipe sai do PRÓPRIO
 * manifesto (`team.id`), e não do ambiente: se o id da equipe mudasse na env e
 * aqui não, a function abriria para um time que não existe — ou pior, para
 * ninguém sem que o plano percebesse.
 */
export function executeRoles(audience: FunctionAudience): string[] {
  if (audience === 'users') return ['users'];
  if (audience === 'admins') return [`team:${team.id}`];
  return [];
}

/** Escopos da chave DINÂMICA da function — o que ela mesma pode fazer. */
export function functionScopes(definition: FunctionDefinition): ProjectKeyScopes[] {
  if (!definition.implemented) return [];
  return [
    ProjectKeyScopes.RowsRead,
    ProjectKeyScopes.RowsWrite,
    ...(definition.readsTeams ? [ProjectKeyScopes.TeamsRead] : []),
  ];
}
export const levelSeed = [
  { id: 'exploradora', name: 'Exploradora NUY', minPoints: 0, maxPoints: 500 },
  { id: 'criadora', name: 'Criadora NUY', minPoints: 501, maxPoints: 1500 },
  { id: 'inspiradora', name: 'Inspiradora NUY', minPoints: 1501, maxPoints: 3000 },
  { id: 'embaixadora', name: 'Embaixadora NUY', minPoints: 3001, maxPoints: 5000 },
  { id: 'icone', name: 'Ícone NUY', minPoints: 5001, maxPoints: null },
];
