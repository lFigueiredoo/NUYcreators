import 'server-only';
import {
  OPERATIONS_OFFLINE,
  functionsOnline,
  runFunction,
} from '@/features/workspace/services/commands';
import type {
  AdminSubmission,
  AdminSubmissionDetail,
  AuditEntry,
  CatalogCampaign,
  CatalogChallenge,
  CatalogChallengeDetail,
  CatalogOptions,
  CatalogReward,
  CreatorDetail,
  CreatorSummary,
  ReportSummary,
} from '@/features/workspace/core';

/**
 * Ponte entre a administração e a Function `admin-console`.
 *
 * A tela NÃO fala com o banco: quem lê e quem grava é a Function, que apura o
 * papel e usa a chave do próprio runtime. Aqui só se monta a chamada e se
 * devolve o resultado — sem `select`, sem SQL, sem chave no processo do app.
 *
 * `runFunction` é a MESMA porta das outras Functions: sessão da usuária, JWT
 * injetado pela plataforma, e tradução única de recusa (401 da plataforma vira
 * "sem permissão", function ausente vira "operação não publicada"). Duplicar essa
 * tradução aqui criaria uma segunda lista de mensagens para divergir da primeira.
 */
export type AdminOutcome<T> = { ok: true; value: T } | { ok: false; message: string };

const FUNCTION_ID = 'admin-console';

async function call<T>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<AdminOutcome<T>> {
  if (!functionsOnline()) return { ok: false, message: OPERATIONS_OFFLINE };
  return runFunction<T>(FUNCTION_ID, { action, ...body });
}

/** Visão geral: contagens exatas do banco. */
export async function loadOverview(): Promise<AdminOutcome<Record<string, number>>> {
  return call('overview');
}

export async function loadChallenges(
  status: string,
): Promise<AdminOutcome<{ items: CatalogChallenge[] }>> {
  return call('challenges.list', { status });
}

export async function loadChallenge(
  challengeId: string,
): Promise<AdminOutcome<{ item: CatalogChallengeDetail | null }>> {
  return call('challenges.get', { challengeId });
}

export async function loadRewards(
  status: string,
): Promise<AdminOutcome<{ items: CatalogReward[] }>> {
  return call('rewards.list', { status });
}

export async function loadReward(
  rewardId: string,
): Promise<AdminOutcome<{ item: (CatalogReward & { history: AuditEntry[] }) | null }>> {
  return call('rewards.get', { rewardId });
}

export async function loadCampaigns(): Promise<AdminOutcome<{ items: CatalogCampaign[] }>> {
  return call('campaigns.list');
}

/** Níveis, campanhas e produtos por nome — para os formulários escolherem, não digitarem id. */
export async function loadOptions(): Promise<AdminOutcome<CatalogOptions>> {
  return call('catalog.options');
}

export async function loadSubmissions(filters: {
  status?: string;
  challengeId?: string;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<AdminOutcome<{ items: AdminSubmission[] }>> {
  return call('submissions.list', filters);
}

export async function loadSubmission(
  submissionId: string,
): Promise<AdminOutcome<{ item: AdminSubmissionDetail | null }>> {
  return call('submissions.get', { submissionId });
}

export async function loadCreators(
  search = '',
): Promise<AdminOutcome<{ items: CreatorSummary[]; sampled: boolean }>> {
  return call('creators.list', { search });
}

export async function loadCreator(
  userId: string,
): Promise<AdminOutcome<{ item: CreatorDetail | null }>> {
  return call('creators.get', { userId });
}

export async function loadReport(days: number): Promise<AdminOutcome<ReportSummary>> {
  return call('report', { days });
}

export async function loadRecentAudit(): Promise<AdminOutcome<{ items: AuditEntry[] }>> {
  return call('audit.recent', { limit: 12 });
}

/**
 * Comandos de escrita.
 *
 * Todos devolvem `{ ok, message }` — a mensagem de recusa já vem traduzida, e a
 * de sucesso é escrita aqui porque cada tela sabe o que prometeu ao operador.
 * Nenhuma delas afirma mais do que o retorno da Function prova.
 */
export type AdminCommand<T> =
  { ok: true; message: string; value: T } | { ok: false; message: string };

export async function commandSaveChallenge(
  input: Record<string, unknown>,
  publish: boolean,
): Promise<
  AdminCommand<{ challengeId: string; status: string; version: number; created: boolean }>
> {
  const reply = await call<{
    challengeId: string;
    status: string;
    version: number;
    created: boolean;
  }>('challenge.save', { ...input, publish });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: publish
      ? reply.value.created
        ? 'Desafio criado e publicado. Ele já aparece para as creators dentro do período informado.'
        : 'Desafio publicado. As alterações já valem para as creators.'
      : reply.value.created
        ? 'Rascunho salvo. Ele não aparece para as creators até ser publicado.'
        : 'Alterações salvas como rascunho.',
  };
}

export async function commandChallengeStatus(
  challengeId: string,
  expectedVersion: number | null,
  next: 'publish' | 'close',
): Promise<AdminCommand<{ status: string; version: number }>> {
  const reply = await call<{ status: string; version: number }>(`challenge.${next}`, {
    challengeId,
    expectedVersion,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message:
      next === 'publish'
        ? 'Desafio publicado. Ele passa a ser lido pelas creators.'
        : 'Desafio encerrado. Novas participações e envios são recusados; quem participou continua vendo.',
  };
}

export async function commandSaveReward(
  input: Record<string, unknown>,
  publish: boolean,
): Promise<AdminCommand<{ rewardId: string; status: string; version: number; created: boolean }>> {
  const reply = await call<{ rewardId: string; status: string; version: number; created: boolean }>(
    'reward.save',
    { ...input, publish },
  );
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: reply.value.created
      ? publish
        ? 'Recompensa criada e ativada no catálogo.'
        : 'Rascunho de recompensa salvo. Ela não aparece no catálogo até ser ativada.'
      : 'Recompensa salva.',
  };
}

export async function commandRewardStatus(
  rewardId: string,
  expectedVersion: number | null,
  next: 'publish' | 'close',
): Promise<AdminCommand<{ status: string; version: number }>> {
  const reply = await call<{ status: string; version: number }>(`reward.${next}`, {
    rewardId,
    expectedVersion,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message:
      next === 'publish'
        ? 'Recompensa ativada: ela volta a aparecer para as creators.'
        : 'Recompensa desativada. Resgates já feitos seguem válidos.',
  };
}

export async function commandRewardStock(
  rewardId: string,
  stock: number,
  reason: string,
  expectedVersion: number | null,
): Promise<AdminCommand<{ stock: number; version: number }>> {
  const reply = await call<{ stock: number; version: number }>('reward.stock', {
    rewardId,
    stock,
    reason,
    expectedVersion,
  });
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: `Estoque ajustado para ${reply.value.stock}. O motivo ficou registrado na auditoria.`,
  };
}

export async function commandSaveCampaign(
  input: Record<string, unknown>,
): Promise<AdminCommand<{ campaignId: string; status: string; created: boolean }>> {
  const reply = await call<{ campaignId: string; status: string; created: boolean }>(
    'campaign.save',
    input,
  );
  if (!reply.ok) return reply;
  return {
    ok: true,
    value: reply.value,
    message: reply.value.created ? 'Campanha criada.' : 'Campanha atualizada.',
  };
}
