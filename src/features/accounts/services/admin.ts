import 'server-only';
import { randomUUID } from 'node:crypto';
import { databaseId, operationsConfigured, opsTables } from '@/lib/appwrite/data';
import { requireStaff } from '@/lib/security/authorization';
import type { CoreContext } from '@/features/workspace/core/context';
import { loadCreatorApplications } from '../core/approval';
import type { ReviewedAccountStatus, CreatorApplication } from '../domain/approval';

export type ApprovalList = {
  items: CreatorApplication[];
  nextCursor: string | null;
  scanned: number;
};
export type ApprovalListResult = { ok: true; value: ApprovalList } | { ok: false; message: string };

export async function approvalAdministrationContext(): Promise<CoreContext | null> {
  const { user, roles } = await requireStaff('review-creators');
  if (!operationsConfigured()) return null;
  return {
    tables: opsTables(),
    databaseId: databaseId(),
    actor: { userId: user.$id, roles },
    now: new Date(),
    correlationId: randomUUID(),
  };
}

export async function loadAdminCreatorApplications(input: {
  status: ReviewedAccountStatus;
  cursor?: string;
}): Promise<ApprovalListResult> {
  const ctx = await approvalAdministrationContext();
  if (!ctx)
    return { ok: false, message: 'A análise de contas ainda não está disponível neste ambiente.' };
  try {
    const result = await loadCreatorApplications(ctx, input);
    if (result.ok) return { ok: true, value: result.value };
    return {
      ok: false,
      message:
        result.failure.code === 'forbidden'
          ? 'Sua conta não tem permissão para analisar cadastros.'
          : 'Não foi possível carregar as solicitações. Tente novamente em instantes.',
    };
  } catch (error) {
    console.error('[accounts:approval-list] falha de leitura', {
      code: (error as { code?: unknown }).code ?? 0,
    });
    return { ok: false, message: 'Não foi possível carregar as solicitações. Tente novamente.' };
  }
}
