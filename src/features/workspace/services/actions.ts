'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getEnvironment } from '@/lib/env/server';
import {
  commandAdjustPoints,
  commandJoin,
  commandModerate,
  commandReadAllNotifications,
  commandRedeem,
  commandSetNotificationRead,
  commandSubmit,
  commandUpdateProfile,
} from './commands';
import type { ModerationDecision, ProfileInput } from '../core';

/**
 * Server Actions do workspace.
 *
 * Mesmo contrato das actions de autenticação: `FormState` com uma mensagem em
 * português e nada de exceção crua chegando à tela. Toda action confere a ORIGEM
 * da requisição antes de olhar o formulário — Server Function é alcançável por
 * POST direto, então a origem é conferida aqui e a identidade é sempre a da
 * sessão, nunca um campo do formulário.
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

export async function joinChallengeAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const outcome = await commandJoin(field(data, 'challengeId'));
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/desafios');
  revalidatePath('/app');
  return { message: outcome.message, success: true };
}

export async function submitContentAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const outcome = await commandSubmit({
    challengeId: field(data, 'challengeId'),
    url: field(data, 'url'),
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/desafios');
  revalidatePath('/app/conteudos');
  return { message: outcome.message, success: true };
}

export async function moderateSubmissionAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const decision = field(data, 'decision') as ModerationDecision;
  if (!['approve', 'reject', 'request_revision'].includes(decision))
    return { message: 'Decisão inválida.' };
  const outcome = await commandModerate({
    submissionId: field(data, 'submissionId'),
    decision,
    reason: field(data, 'reason'),
    // A revisão vai e volta pelo formulário para que a equipe decida sobre o
    // que VIU: se a criadora reenviar no meio, o comando recusa em vez de
    // aprovar conteúdo que ninguém leu.
    expectedRevision: numberField(data, 'expectedRevision'),
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/admin/submissoes');
  revalidatePath('/app/conteudos');
  return { message: outcome.message, success: true };
}

export async function redeemRewardAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const rewardId = field(data, 'rewardId');
  const idempotencyKey = field(data, 'idempotencyKey');
  if (!rewardId || !idempotencyKey || idempotencyKey.length > 64)
    return { message: 'Recarregue a página antes de resgatar.' };
  const outcome = await commandRedeem({
    rewardId,
    expectedCost: numberField(data, 'expectedCost'),
    idempotencyKey,
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/recompensas');
  revalidatePath('/app/pontos');
  return { message: outcome.message, success: true };
}

export async function notificationReadAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const outcome = await commandSetNotificationRead({
    notificationId: field(data, 'notificationId'),
    read: field(data, 'read') !== 'false',
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/notificacoes');
  return { message: outcome.message, success: true };
}

/**
 * Marca toda a central como lida. Não declara parâmetro nenhum de propósito:
 * esta ação não lê NADA do formulário — o alvo é sempre a dona da sessão. Menos
 * parâmetro é menos coisa para um payload conseguir influenciar.
 */
export async function notificationsReadAllAction(): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const outcome = await commandReadAllNotifications();
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/notificacoes');
  return { message: outcome.message, success: true };
}

export async function updateProfileAction(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const input: ProfileInput = {
    name: field(data, 'name'),
    phone: field(data, 'phone'),
    city: field(data, 'city'),
    state: field(data, 'state'),
    birthDate: field(data, 'birthDate'),
    niche: field(data, 'niche'),
    creatorType: field(data, 'creatorType'),
    publicProfile: field(data, 'publicProfile') === 'on' || field(data, 'publicProfile') === 'true',
  };
  const outcome = await commandUpdateProfile(input);
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/perfil');
  revalidatePath('/app/ranking');
  return { message: outcome.message, success: true };
}

/**
 * Ajuste administrativo de pontos.
 *
 * Uma única implementação, agora usada pela ficha da creator na administração: o
 * comando é de equipe e exige motivo e referência. Duplicar esta action na área
 * administrativa criaria duas validações do mesmo ajuste — e uma delas envelheceria.
 * A revalidação cobre as duas telas que mostram o mesmo saldo.
 */
export async function adjustPointsAction(_previous: FormState, data: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: DENIED };
  const amount = numberField(data, 'amount');
  if (amount === null || !Number.isInteger(amount) || amount === 0)
    return { message: 'Informe um número inteiro de pontos diferente de zero.' };
  const userId = field(data, 'userId');
  const outcome = await commandAdjustPoints({
    userId,
    amount,
    reason: field(data, 'reason'),
    referenceId: field(data, 'referenceId'),
    key: field(data, 'key'),
  });
  if (!outcome.ok) return { message: outcome.message };
  revalidatePath('/app/pontos');
  if (userId) {
    revalidatePath('/admin/creators');
    revalidatePath(`/admin/creators/${userId}`);
  }
  return { message: outcome.message, success: true };
}
