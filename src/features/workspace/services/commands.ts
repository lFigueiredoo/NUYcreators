import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { ExecutionMethod, Functions } from 'node-appwrite';
import { databaseId, operationsConfigured, opsTables } from '@/lib/appwrite/data';
import { SESSION_COOKIE, currentUser, sessionClient } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { sessionRoles } from '@/lib/security/authorization';
import {
  markAllNotificationsRead,
  setNotificationRead,
  syncPublicProfile,
  updateOwnProfile,
  type AdjustInput,
  type AdjustResult,
  type CoreCode,
  type CoreContext,
  type CoreResult,
  type JoinResult,
  type ModerationDecision,
  type ModerateResult,
  type ProfileInput,
  type QueueItem,
  type RedeemResult,
  type SubmitResult,
} from '../core';

/**
 * Ponte entre a tela e o núcleo operacional.
 *
 * Dois caminhos, e a escolha entre eles é MEDIDA, não estética:
 *
 *  1. FUNCTION pelo runtime, com a SESSÃO da usuária — entrar, enviar, moderar,
 *     ajustar, resgatar e ler a fila de análise. A plataforma injeta o
 *     `x-appwrite-user-jwt`; o container apura identidade e papéis e chama o
 *     núcleo. Provado nesta rodada por 41 execuções de
 *     `tests/integration/runtime.test.ts`, todas registradas com deployment,
 *     status da execução e status HTTP.
 *  2. Chave de OPERAÇÃO, só nos comandos que ainda NÃO têm Function (perfil e
 *     notificações): a linha do aviso nasce com `read("user:<id>")`, sem
 *     permissão de escrita para a sessão, e não há Function para virar o
 *     "lido". Sem a chave, esses comandos ficam desligados e dizem isso — nunca
 *     caímos na chave de provisionamento, e nada é simulado.
 *
 * Por que a escrita não vai direto pela sessão: medido em staging
 * (scripts/diag-write-path.mjs) que a sessão leva 401 `user_unauthorized` em
 * `createRow` mesmo em tabela com `rowSecurity` e permissão própria. Toda
 * escrita é mediada pelo servidor — a permissão de linha continua sendo a
 * barreira de LEITURA, e o papel administrativo continua sendo apurado de
 * membership confirmada, nunca do payload.
 */

/**
 * Copy das recusas. O núcleo devolve CÓDIGO; a tradução para a usuária mora
 * aqui, e nada aqui promete o que não aconteceu.
 */
const MESSAGES: Record<CoreCode, string> = {
  unauthenticated: 'Sua sessão expirou. Entre novamente para continuar.',
  forbidden: 'Sua conta não tem permissão para esta ação.',
  not_found: 'Não encontramos este registro. Ele pode ter sido removido.',
  invalid: 'Confira os dados informados e tente de novo.',
  unavailable: 'A operação está indisponível agora. Tente novamente em instantes.',
  conflict: 'O registro mudou desde que esta tela foi aberta. Recarregue e tente de novo.',
  // O código cobre as DUAS pontas da janela (`core/join` recusa antes do início e
  // depois do fim): "não está mais no prazo" era falso para o desafio que ainda
  // não começou — o caso que a tela oferecia a entrar.
  window_closed: 'Esta ação está fora do prazo: ou ainda não começou, ou já foi encerrada.',
  not_published: 'Este desafio não está publicado.',
  level_required: 'Seu nível atual ainda não alcança o exigido por este desafio.',
  capacity_full: 'As vagas deste desafio já foram preenchidas.',
  not_participant: 'Você precisa entrar no desafio antes de enviar conteúdo.',
  duplicate_content: 'Este conteúdo já está registrado em um envio seu deste desafio.',
  insufficient_points: 'Seus pontos disponíveis não são suficientes para este resgate.',
  out_of_stock: 'Esta recompensa está sem estoque.',
  limit_reached: 'Você já atingiu o limite de resgates desta recompensa.',
  price_changed: 'O custo desta recompensa mudou. Recarregue a página antes de resgatar.',
};

export const OPERATIONS_OFFLINE =
  'Esta ação ainda não está ativa neste ambiente: a operação no servidor não foi configurada. Nada foi gravado.';

export type CommandOutcome<T> =
  { ok: true; message: string; value: T } | { ok: false; message: string };

/** Resposta da Function já traduzida: valor de negócio, ou recado para a tela. */
type FunctionReply<T> = { ok: true; value: T } | { ok: false; message: string };

/** O que `createExecution` devolve: o SDK não exporta o modelo pelo nome. */
type Execution = Awaited<ReturnType<Functions['createExecution']>>;

export function describe<T>(result: CoreResult<T>, success: string): CommandOutcome<T> {
  if (result.ok) return { ok: true, message: success, value: result.value };
  return { ok: false, message: MESSAGES[result.failure.code] };
}

/** Caminho das Functions (join, envio, moderação, ajuste, resgate). */
export function functionsOnline() {
  const env = getEnvironment();
  return Boolean(
    env.APPWRITE_ENDPOINT && env.APPWRITE_PROJECT_ID && env.APPWRITE_FUNCTIONS_ENABLED === 'true',
  );
}

/** Caminho da chave de operação (perfil e notificações, que não têm Function). */
export function operationsOnline() {
  return operationsConfigured();
}

function isCoreCode(value: string): value is CoreCode {
  return Object.prototype.hasOwnProperty.call(MESSAGES, value);
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Executa a Function pelo RUNTIME do Appwrite, com a SESSÃO da usuária.
 *
 * Medido nesta rodada, no staging: `createExecution` com cliente de sessão faz a
 * plataforma injetar o JWT — e quem chama NÃO consegue forjar cabeçalho
 * `x-appwrite-*`, então a identidade que a Function vê é a da sessão, nunca a do
 * formulário. As duas recusas chegam por caminhos diferentes e são traduzidas
 * separadamente:
 *
 *  - papel de `execute` fechado → **401 `user_unauthorized`** com a mensagem
 *    `Missing "execute" permission for role …` (medido agora com cliente
 *    anônimo: é a plataforma dizendo que a CONTA não pode executar, não que a
 *    sessão expirou) → `forbidden`;
 *  - Function inexistente → **404 `function_not_found`** → operação não
 *    publicada neste ambiente → `OPERATIONS_OFFLINE`;
 *  - recusa de NEGÓCIO volta no corpo como `{ error: <código> }` com o status do
 *    núcleo; o código é o que a tela traduz, sem intermediário.
 *
 * Execução que não completou não tem resposta de negócio: vira indisponibilidade
 * retentável, com o FATO registrado no log — nunca corpo de resposta nem
 * credencial (pode carregar detalhe de conta).
 */
export async function runFunction<T>(
  functionId: string,
  body: Record<string, unknown>,
): Promise<FunctionReply<T>> {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return { ok: false, message: MESSAGES.unauthenticated };
  let execution: Execution;
  try {
    execution = await new Functions(sessionClient(secret)).createExecution({
      functionId,
      body: JSON.stringify(body),
      async: false,
      method: ExecutionMethod.POST,
      xpath: '/',
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const refusal = error as { code?: number; type?: string; message?: string };
    console.error(
      `function ${functionId}: recusa da plataforma ${refusal.code ?? '?'} ${refusal.type ?? ''}`,
    );
    if (refusal.type === 'function_not_found') return { ok: false, message: OPERATIONS_OFFLINE };
    if (String(refusal.message ?? '').includes('"execute" permission'))
      return { ok: false, message: MESSAGES.forbidden };
    if (refusal.code === 401) return { ok: false, message: MESSAGES.unauthenticated };
    if (refusal.code === 403) return { ok: false, message: MESSAGES.forbidden };
    return { ok: false, message: MESSAGES.unavailable };
  }
  if (execution.status !== 'completed') {
    console.error(`function ${functionId}: execução ${execution.status}, sem resposta de negócio`);
    return { ok: false, message: MESSAGES.unavailable };
  }
  const payload = parseJson(execution.responseBody);
  const status = execution.responseStatusCode;
  if (status >= 200 && status < 300 && payload) return { ok: true, value: payload as T };
  const code = typeof payload?.error === 'string' ? payload.error : '';
  if (isCoreCode(code)) return { ok: false, message: MESSAGES[code] };
  return { ok: false, message: MESSAGES.unavailable };
}

/**
 * Contexto do comando de OPERAÇÃO: identidade da SESSÃO (nunca do formulário) e
 * papéis apurados de membership confirmada na equipe administrativa.
 */
export async function workspaceContext(): Promise<CoreContext | null> {
  if (!operationsConfigured()) return null;
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return null;
  const user = await currentUser();
  if (!user) return null;
  return {
    tables: opsTables(),
    databaseId: databaseId(),
    actor: { userId: user.$id, roles: await sessionRoles(secret, user.$id) },
    now: new Date(),
    correlationId: randomUUID(),
    academyCommentsReady: process.env.APPWRITE_ACADEMY_SCHEMA_READY === 'true' ||
      process.env.APPWRITE_ACADEMY_ENABLED === 'true',
    challengeCommentsPrivateReady:
      process.env.APPWRITE_ACADEMY_CHALLENGE_ACL_PRIVATE_READY === 'true',
  };
}

export async function commandJoin(challengeId: string): Promise<CommandOutcome<JoinResult>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<JoinResult>('join-challenge', { challengeId });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: reply.value.created
      ? 'Você entrou no desafio. Os requisitos estão na página e o prazo já está valendo.'
      : 'Você já estava neste desafio — nada foi duplicado.',
  };
}

/**
 * Envio de conteúdo.
 *
 * `created: false` acontece em DUAS situações diferentes, e as duas terminam com
 * o conteúdo EM ANÁLISE: o mesmo link reenviado enquanto já havia envio em
 * análise (nada mudou) e o reenvio do MESMO link depois de a equipe pedir
 * revisão — ali a revisão AVANÇA e o conteúdo volta para a fila. A copy antiga
 * ("nada foi duplicado") só era verdade na primeira: na segunda, dizia à creator
 * que nada tinha acontecido logo depois de registrar uma revisão nova. A frase
 * abaixo é verdadeira nas duas.
 */
export async function commandSubmit(input: {
  challengeId: string;
  url: string;
}): Promise<CommandOutcome<SubmitResult>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<SubmitResult>('submit-content', {
    challengeId: input.challengeId,
    url: input.url,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: reply.value.created
      ? 'Envio registrado. Ele entra na fila de análise da equipe NUY.'
      : 'Este conteúdo já está registrado e em análise pela equipe NUY.',
  };
}

export async function commandModerate(input: {
  submissionId: string;
  decision: ModerationDecision;
  reason: string;
  expectedRevision: number | null;
}): Promise<CommandOutcome<ModerateResult>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<ModerateResult>('moderate-submission', {
    submissionId: input.submissionId,
    decision: input.decision,
    reason: input.reason,
    expectedRevision: input.expectedRevision,
  });
  if (!reply.ok) return reply;
  const success =
    input.decision === 'approve'
      ? reply.value.credited
        ? `Envio aprovado. ${reply.value.pointsAwarded} pontos creditados uma única vez.`
        : 'Envio aprovado. Este desafio não credita pontos.'
      : input.decision === 'reject'
        ? 'Envio recusado. A criadora vê a decisão no acompanhamento.'
        : 'Revisão solicitada. A criadora pode reenviar o conteúdo.';
  return { ok: true, value: reply.value, message: success };
}

export async function commandRedeem(input: {
  rewardId: string;
  expectedCost: number | null;
  idempotencyKey: string;
}): Promise<CommandOutcome<RedeemResult>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<RedeemResult>('redeem-reward', {
    rewardId: input.rewardId,
    expectedCost: input.expectedCost,
    idempotencyKey: input.idempotencyKey,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: reply.value.created
      ? 'Resgate registrado. Os pontos saíram do seu saldo disponível e o estoque foi atualizado.'
      : 'Este resgate já havia sido registrado — nenhum ponto foi debitado de novo.',
  };
}

export async function commandSetNotificationRead(input: { notificationId: string; read: boolean }) {
  const ctx = await workspaceContext();
  if (!ctx) return { ok: false as const, message: OPERATIONS_OFFLINE };
  return describe(
    await setNotificationRead(ctx, input),
    input.read ? 'Aviso marcado como lido.' : 'Aviso marcado como não lido.',
  );
}

export async function commandReadAllNotifications() {
  const ctx = await workspaceContext();
  if (!ctx) return { ok: false as const, message: OPERATIONS_OFFLINE };
  const result = await markAllNotificationsRead(ctx);
  if (!result.ok) return describe(result, '');
  return {
    ok: true as const,
    message:
      result.value.updated > 0
        ? `${result.value.updated} aviso${result.value.updated === 1 ? '' : 's'} marcado${result.value.updated === 1 ? '' : 's'} como lido${result.value.updated === 1 ? '' : 's'}.`
        : 'Não havia avisos não lidos.',
    value: result.value,
  };
}

/**
 * Perfil: dois comandos em sequência, ambos do núcleo. A edição grava o perfil;
 * a projeção pública acompanha o mesmo nome e o mesmo consentimento — desligar
 * o perfil público retira a projeção em vez de deixar o nome antigo no ranking.
 */
export async function commandUpdateProfile(input: ProfileInput) {
  const ctx = await workspaceContext();
  if (!ctx) return { ok: false as const, message: OPERATIONS_OFFLINE };
  const result = await updateOwnProfile(ctx, input);
  if (!result.ok) return describe(result, '');
  const projection = await syncPublicProfile(ctx, {
    displayName: input.name,
    publicProfile: result.value.publicProfile,
  });
  const published = projection.ok ? projection.value.published : null;
  return {
    ok: true as const,
    message:
      published === null
        ? 'Perfil atualizado. A exibição pública não pôde ser atualizada agora.'
        : published
          ? 'Perfil atualizado e nome público ativado no ranking.'
          : 'Perfil atualizado. Seu nome não aparece em áreas públicas.',
    value: { ...result.value, published },
  };
}

export async function commandAdjustPoints(
  input: AdjustInput,
): Promise<CommandOutcome<AdjustResult>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<AdjustResult>('adjust-points', {
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    referenceId: input.referenceId,
    key: input.key,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message:
      input.amount > 0
        ? 'Ajuste aplicado: pontos creditados no saldo disponível.'
        : 'Ajuste aplicado: pontos debitados do saldo disponível.',
  };
}

/** Submissão em análise, para a fila de moderação. Só quem pode moderar lê. */
export type PendingSubmission = {
  id: string;
  challengeId: string;
  challengeName: string;
  userId: string;
  url: string;
  platform: string;
  revision: number;
  submittedAt: string;
};

/**
 * Fila de análise pela Function `moderate-submission` (ação `queue`).
 *
 * A linha de `challenge_submissions` é legível só pelo DONO, por permissão de
 * linha. A equipe lê a fila pela Function, que apura o papel `moderate` com a
 * chave do próprio runtime — a permissão da linha NÃO é relaxada para isso, e a
 * plataforma ainda fecha a execução antes do container para quem não é da equipe.
 */
export async function listPendingSubmissions(
  limit = 50,
): Promise<{ ok: true; items: PendingSubmission[] } | { ok: false; message: string }> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  const reply = await runFunction<{ items: QueueItem[] }>('moderate-submission', {
    action: 'queue',
    limit,
  });
  if (!reply.ok) return reply;
  const items = Array.isArray(reply.value.items) ? reply.value.items : [];
  return {
    ok: true,
    items: items.map((item) => ({
      id: item.submissionId,
      challengeId: item.challengeId,
      challengeName: item.challengeName,
      userId: item.userId,
      url: item.url,
      platform: item.platform,
      revision: item.revision,
      submittedAt: item.submittedAt,
    })),
  };
}
