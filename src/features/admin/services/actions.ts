'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getEnvironment } from '@/lib/env/server';
import { rankingTimeZone } from '@/features/workspace/domain/ranking';
import {
  campaignIssues,
  challengeIssues,
  rewardIssues,
  type CampaignDraft,
  type ChallengeDraft,
  type RewardDraft,
} from '@/features/workspace/domain/catalog';
import {
  commandChallengeStatus,
  commandRewardStatus,
  commandRewardStock,
  commandSaveCampaign,
  commandSaveChallenge,
  commandSaveReward,
} from './console';

/**
 * Server Actions da administração.
 *
 * Mesmo contrato do resto do produto: `FormState` com uma mensagem em português,
 * origem conferida antes de olhar o formulário, e identidade NUNCA vinda de
 * campo — quem age é a sessão, e o papel é apurado na Function, do outro lado.
 * A validação aqui existe para o operador ver o problema sem uma ida ao servidor
 * de função; a Function valida de novo, porque este formulário não é confiável.
 */
export type FormState = { message: string; success?: boolean };

const DENIED = 'Requisição não reconhecida. Recarregue a página e tente novamente.';

async function allowedRequest() {
  const origin = (await headers()).get('origin');
  return origin === new URL(getEnvironment().APP_URL).origin;
}

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function numberField(data: FormData, key: string): number | null {
  const raw = field(data, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerField(data: FormData, key: string): number {
  const raw = field(data, key);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

/** Mensagem de validação: o que impede a gravação, sem esconder nada atrás de "inválido". */
function problems(issues: string[]): FormState | null {
  if (!issues.length) return null;
  return { message: `Revise o formulário: ${issues.slice(0, 4).join(' ')}` };
}

function challengeDraft(data: FormData): ChallengeDraft {
  const types = data.getAll('requirementType').map(String);
  const required = data.getAll('requirementRequired').map(String);
  const configs = data.getAll('requirementConfig').map(String);
  return {
    slug: field(data, 'slug'),
    name: field(data, 'name'),
    description: field(data, 'description'),
    platform: field(data, 'platform'),
    startsAt: field(data, 'startsAt'),
    endsAt: field(data, 'endsAt'),
    points: integerField(data, 'points'),
    imageFileId: field(data, 'imageFileId'),
    requiredLevelId: field(data, 'requiredLevelId'),
    participantLimit: numberField(data, 'participantLimit'),
    campaignId: field(data, 'campaignId'),
    productId: field(data, 'productId'),
    hashtags: field(data, 'hashtags'),
    mentions: field(data, 'mentions'),
    requirements: types
      .map((type, index) => ({
        type,
        required: required[index] === 'true',
        configJson: configs[index] ?? '',
      }))
      .filter((requirement) => requirement.type !== '' || requirement.configJson !== ''),
  };
}

function rewardDraft(data: FormData): RewardDraft {
  return {
    name: field(data, 'name'),
    type: field(data, 'type'),
    description: field(data, 'description'),
    pointsCost: integerField(data, 'pointsCost'),
    stock: integerField(data, 'stock'),
    perUserLimit: integerField(data, 'perUserLimit'),
    startsAt: field(data, 'startsAt'),
    endsAt: field(data, 'endsAt'),
    imageFileId: field(data, 'imageFileId'),
  };
}

function campaignDraft(data: FormData): CampaignDraft {
  return {
    name: field(data, 'name'),
    description: field(data, 'description'),
    startsAt: field(data, 'startsAt'),
    endsAt: field(data, 'endsAt'),
    status: field(data, 'status') as CampaignDraft['status'],
  };
}

export async function challengeSaveAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const draft = challengeDraft(data);
  const invalid = problems(challengeIssues(draft));
  if (invalid) return invalid;
  // "Salvar rascunho" e "Publicar" são o MESMO formulário com intenções
  // diferentes: o rascunho não aparece para ninguém até a publicação.
  const publish = field(data, 'intent') === 'publish';
  // O id do desafio é derivado do slug no núcleo: o formulário manda o conteúdo, e
  // o identificador volta na resposta — é ele que diz qual página revalidar.
  const outcome = await commandSaveChallenge(
    {
      draft,
      expectedVersion: numberField(data, 'expectedVersion'),
      timeZone: rankingTimeZone,
    },
    publish,
  );
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/desafios');
  revalidatePath(`/admin/desafios/${outcome.value.challengeId}`);
  revalidatePath('/app/desafios');
  return { message: outcome.message, success: true };
}

export async function challengeStatusAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const intent = field(data, 'intent');
  if (intent !== 'publish' && intent !== 'close') return { message: 'Ação não reconhecida.' };
  const challengeId = field(data, 'challengeId');
  if (!challengeId) return { message: 'Desafio não identificado. Recarregue a página.' };
  const outcome = await commandChallengeStatus(
    challengeId,
    numberField(data, 'expectedVersion'),
    intent,
  );
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/desafios');
  revalidatePath(`/admin/desafios/${challengeId}`);
  revalidatePath('/app/desafios');
  return { message: outcome.message, success: true };
}

export async function rewardSaveAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const draft = rewardDraft(data);
  const invalid = problems(rewardIssues(draft));
  if (invalid) return invalid;
  const rewardId = field(data, 'rewardId');
  // A chave é sorteada pela tela no clique: repetir o envio não cria duas vezes.
  const key = field(data, 'key');
  if (!rewardId && (key.length < 8 || key.length > 120))
    return { message: 'Recarregue a página antes de salvar.' };
  const outcome = await commandSaveReward(
    {
      key,
      rewardId: rewardId || '',
      draft,
      expectedVersion: numberField(data, 'expectedVersion'),
      timeZone: rankingTimeZone,
    },
    field(data, 'intent') === 'publish',
  );
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/recompensas');
  revalidatePath(`/admin/recompensas/${outcome.value.rewardId}`);
  revalidatePath('/app/recompensas');
  return { message: outcome.message, success: true };
}

export async function rewardStatusAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const intent = field(data, 'intent');
  if (intent !== 'publish' && intent !== 'close') return { message: 'Ação não reconhecida.' };
  const rewardId = field(data, 'rewardId');
  if (!rewardId) return { message: 'Recompensa não identificada. Recarregue a página.' };
  const outcome = await commandRewardStatus(rewardId, numberField(data, 'expectedVersion'), intent);
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/recompensas');
  revalidatePath(`/admin/recompensas/${rewardId}`);
  revalidatePath('/app/recompensas');
  return { message: outcome.message, success: true };
}

export async function rewardStockAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const rewardId = field(data, 'rewardId');
  const stock = numberField(data, 'stock');
  const reason = field(data, 'reason');
  if (!rewardId) return { message: 'Recompensa não identificada. Recarregue a página.' };
  if (stock === null || !Number.isInteger(stock) || stock < 0)
    return { message: 'Informe o estoque como um número inteiro maior ou igual a zero.' };
  if (reason.length < 3) return { message: 'Escreva o motivo do ajuste — ele fica na auditoria.' };
  const outcome = await commandRewardStock(
    rewardId,
    stock,
    reason,
    numberField(data, 'expectedVersion'),
  );
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/recompensas');
  revalidatePath(`/admin/recompensas/${rewardId}`);
  revalidatePath('/app/recompensas');
  return { message: outcome.message, success: true };
}

export async function campaignSaveAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const draft = campaignDraft(data);
  const invalid = problems(campaignIssues(draft));
  if (invalid) return invalid;
  const campaignId = field(data, 'campaignId');
  const key = field(data, 'key');
  if (!campaignId && (key.length < 8 || key.length > 120))
    return { message: 'Recarregue a página antes de salvar.' };
  const outcome = await commandSaveCampaign({
    key,
    campaignId: campaignId || '',
    draft,
    timeZone: rankingTimeZone,
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/campanhas');
  return { message: outcome.message, success: true };
}
