import { createHash } from 'node:crypto';
import { ownerReadPermissions } from '../../../lib/security/permissions';
import { CURRENT_LEGAL_CONSENT_VERSION } from '../../legal/versions';
import type { OnboardingInput } from '../../profiles/schemas/onboarding';
import { done, type CoreContext } from '../../workspace/core/context';
import { inTransaction } from '../../workspace/core/transaction';

export class CreatorOnboardingError extends Error {
  constructor(
    public readonly code:
      | 'account_disabled'
      | 'profile_already_completed'
      | 'application_changed'
      | 'profile_unavailable',
  ) {
    super(code);
  }
}

/**
 * Persistência compartilhada pelos hosts Next e Appwrite. A identidade e as
 * políticas são verificadas pelo host; este módulo nunca recebe status/role
 * do formulário. O marcador de conclusão continua sendo a última escrita.
 */
export async function savePendingCreatorProfile(
  ctx: CoreContext,
  input: OnboardingInput,
): Promise<void> {
  const result = await inTransaction(ctx, async (tx) => {
    if (!tx.transactionId) throw new CreatorOnboardingError('profile_unavailable');
    await persistCreatorProfile(ctx, input, tx.transactionId);
    return done({ saved: true });
  });
  if (!result.ok)
    throw new CreatorOnboardingError(
      result.failure.code === 'conflict' ? 'application_changed' : 'profile_unavailable',
    );
}

async function persistCreatorProfile(
  ctx: CoreContext,
  input: OnboardingInput,
  transactionId: string,
) {
  const { tables: db, databaseId } = ctx;
  const userId = ctx.actor.userId;
  if (!userId) throw new CreatorOnboardingError('account_disabled');
  const permissions = ownerReadPermissions(userId);
  try {
    const existing = await db.getRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
      transactionId,
    });
    if (existing.userId !== undefined && existing.userId !== userId)
      throw new CreatorOnboardingError('account_disabled');
    if (typeof existing.onboardingCompletedAt === 'string' && existing.onboardingCompletedAt)
      throw new CreatorOnboardingError('profile_already_completed');
  } catch (error) {
    if ((error as { code?: unknown }).code !== 404) throw error;
  }

  const checkAccount = (record: Record<string, unknown>) => {
    if (
      record.authUserId !== userId ||
      !['active', 'pending_review'].includes(String(record.status))
    )
      throw new CreatorOnboardingError('account_disabled');
  };
  try {
    const account = await db.getRow({ databaseId, tableId: 'users', rowId: userId, transactionId });
    checkAccount(account);
    // O mesmo usuário é tocado pela decisão administrativa. Esta escrita entra
    // no conjunto de conflito sem regravar o status nem reabrir uma recusa.
    await db.updateRow({
      databaseId,
      tableId: 'users',
      rowId: userId,
      data: {
        acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
        consentAt:
          account.acceptedTermsVersion === CURRENT_LEGAL_CONSENT_VERSION &&
          typeof account.consentAt === 'string'
            ? account.consentAt
            : ctx.now.toISOString(),
      },
      permissions,
      transactionId,
    });
  } catch (error) {
    if ((error as { code?: unknown }).code !== 404) throw error;
    try {
      await db.createRow({
        databaseId,
        tableId: 'users',
        rowId: userId,
        data: {
          authUserId: userId,
          status: 'pending_review',
          acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
          consentAt: ctx.now.toISOString(),
        },
        permissions,
        transactionId,
      });
    } catch (conflict) {
      if ((conflict as { code?: unknown }).code !== 409) throw conflict;
      // Uma decisão concorrente nunca é substituída por uma reabertura.
      checkAccount(await db.getRow({ databaseId, tableId: 'users', rowId: userId, transactionId }));
    }
  }

  async function upsert(tableId: string, rowId: string, data: Record<string, unknown>) {
    try {
      const existing = await db.getRow({ databaseId, tableId, rowId, transactionId });
      if (existing.userId !== undefined && existing.userId !== userId)
        throw new CreatorOnboardingError('account_disabled');
      await db.updateRow({ databaseId, tableId, rowId, data, permissions, transactionId });
    } catch (error) {
      if ((error as { code?: unknown }).code !== 404) throw error;
      try {
        await db.createRow({ databaseId, tableId, rowId, data, permissions, transactionId });
      } catch (conflict) {
        if ((conflict as { code?: unknown }).code !== 409) throw conflict;
        const existing = await db.getRow({ databaseId, tableId, rowId, transactionId });
        if (existing.userId !== undefined && existing.userId !== userId)
          throw new CreatorOnboardingError('account_disabled');
        await db.updateRow({ databaseId, tableId, rowId, data, permissions, transactionId });
      }
    }
  }

  const { instagram, tiktok, youtube } = input;
  for (const [platform, canonicalUrl] of Object.entries({ instagram, tiktok, youtube })) {
    const rowId = createHash('sha256').update(`${userId}:${platform}`).digest('hex').slice(0, 36);
    if (canonicalUrl) {
      await upsert('social_accounts', rowId, {
        userId,
        platform,
        canonicalUrl,
        verificationStatus: 'unverified',
      });
    } else {
      try {
        await db.deleteRow({ databaseId, tableId: 'social_accounts', rowId, transactionId });
      } catch (error) {
        if ((error as { code?: unknown }).code !== 404) throw error;
      }
    }
  }
  // Não ativa a conta e não cria saldo. Só a decisão administrativa ativa.
  await upsert('profiles', userId, {
    userId,
    name: input.name,
    phone: input.phone,
    city: input.city,
    state: input.state,
    birthDate: input.birthDate,
    niche: input.niche,
    creatorType: input.creatorType,
    publicProfile: false,
    onboardingCompletedAt: ctx.now.toISOString(),
  });
}
