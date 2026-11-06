'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getEnvironment } from '@/lib/env/server';
import { reviewCreatorApplication } from '../core/approval';
import { approvalAdministrationContext } from './admin';

export type ApprovalReviewState = { message: string; success?: boolean };

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export async function reviewCreatorApplicationAction(
  _previous: ApprovalReviewState,
  data: FormData,
): Promise<ApprovalReviewState> {
  const origin = (await headers()).get('origin');
  if (origin !== new URL(getEnvironment().APP_URL).origin)
    return { message: 'Requisição não reconhecida. Recarregue a página e tente novamente.' };
  const ctx = await approvalAdministrationContext();
  if (!ctx) return { message: 'A análise de contas ainda não está disponível. Nada foi alterado.' };

  const userId = field(data, 'userId');
  const decision = field(data, 'decision');
  const expectedStatus = field(data, 'expectedStatus');
  const reason = field(data, 'reason');
  if (
    !userId ||
    userId.length > 36 ||
    !['approve', 'reject'].includes(decision) ||
    !['pending_review', 'rejected'].includes(expectedStatus)
  )
    return { message: 'Selecione uma decisão válida para este cadastro.' };
  if (reason.length > 2000 || (decision === 'reject' && reason.length < 3))
    return { message: 'Informe o motivo da recusa, entre 3 e 2.000 caracteres.' };

  try {
    const result = await reviewCreatorApplication(ctx, {
      userId,
      decision: decision as 'approve' | 'reject',
      expectedStatus: expectedStatus as 'pending_review' | 'rejected',
      reason,
    });
    if (!result.ok) {
      const messages: Record<string, string> = {
        forbidden: 'Sua conta não tem permissão para analisar cadastros.',
        not_found: 'Este cadastro não foi encontrado. Recarregue a lista.',
        conflict: 'Este cadastro mudou desde que a página foi aberta. Recarregue antes de decidir.',
        invalid: 'Confira a decisão, o motivo e se o perfil está completo.',
      };
      return {
        message:
          messages[result.failure.code] ??
          'Não foi possível confirmar a decisão. Tente novamente em instantes.',
      };
    }
  } catch (error) {
    console.error('[accounts:approval-review] falha ao registrar decisão', {
      code: (error as { code?: unknown }).code ?? 0,
    });
    return {
      message: 'Não foi possível confirmar a decisão. Recarregue a lista e tente novamente.',
    };
  }
  revalidatePath('/admin/aprovacoes');
  revalidatePath('/admin/creators');
  revalidatePath('/aguardando-aprovacao');
  revalidatePath('/app');
  redirect(
    `/admin/aprovacoes?status=pending_review&resultado=${decision === 'approve' ? 'approved' : 'rejected'}`,
  );
}
