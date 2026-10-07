import {
  getTableRow,
  isAbsent,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { onboardingSchema } from '../../profiles/schemas/onboarding';
import { done, failure, type CoreContext, type CoreResult } from './context';

/**
 * Edição do próprio perfil.
 *
 * Reusa a MESMA validação do onboarding (`onboardingSchema`) nos campos que ela
 * cobre: duas réguas para o mesmo dado é como um cadastro passa e a edição não.
 *
 * O que este comando escreve é só o que a usuária pode editar. Nada de saldo,
 * papel, status de conta ou `onboardingCompletedAt`: esses campos não existem no
 * payload e não são copiados de lugar nenhum — a linha é atualizada por chave,
 * uma a uma. A linha é a do próprio `userId` da sessão, e a conferência de dono
 * é feita ANTES de gravar (não se edita perfil que não é seu).
 *
 * `publicProfile` é o consentimento de exibição no ranking público
 * (docs/database.md §Permissões): é da usuária, então é ela quem liga.
 */
export type ProfileInput = {
  name: string;
  phone: string;
  city: string;
  state: string;
  birthDate: string;
  niche: string;
  creatorType: string;
  publicProfile: boolean;
};

export type ProfileResult = { userId: string; publicProfile: boolean };

/** Campos editáveis — o schema do onboarding exige tudo isso; aqui só o perfil. */
const editable = onboardingSchema.pick({
  name: true,
  phone: true,
  city: true,
  state: true,
  birthDate: true,
  niche: true,
  creatorType: true,
});

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function updateOwnProfile(
  ctx: CoreContext,
  input: ProfileInput,
): Promise<CoreResult<ProfileResult>> {
  if (!ctx.actor.userId) return failure('unauthenticated');
  const parsed = editable.safeParse(input);
  if (!parsed.success) return failure('invalid');

  let current: Row;
  try {
    current = await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'profiles',
      rowId: ctx.actor.userId,
    });
  } catch (error) {
    // Perfil que ainda não existe é criado pelo onboarding, não pela edição.
    if (isAbsent(error)) return failure('not_found');
    throw error;
  }
  if (text(current.userId) && text(current.userId) !== ctx.actor.userId)
    return failure('forbidden');

  await updateTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'profiles',
    rowId: ctx.actor.userId,
    data: { ...parsed.data, publicProfile: input.publicProfile === true },
  });
  return done({ userId: ctx.actor.userId, publicProfile: input.publicProfile === true });
}

/**
 * Publica (ou retira) o nome público do ranking.
 *
 * `public_creator_profiles` é a projeção sanitizada: só nome de exibição e
 * avatar, nunca telefone, cidade, e-mail ou data de nascimento. Ligar o perfil
 * público copia o nome; desligar remove a projeção — o ranking volta a mostrar o
 * rótulo neutro em vez de um nome que a usuária retirou.
 */
export async function syncPublicProfile(
  ctx: CoreContext,
  input: { displayName: string; publicProfile: boolean },
): Promise<CoreResult<{ published: boolean }>> {
  if (!ctx.actor.userId) return failure('unauthenticated');
  const existing = await getTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'public_creator_profiles',
    rowId: ctx.actor.userId,
  }).catch((error: unknown) => {
    if (isAbsent(error)) return null;
    throw error;
  });
  if (!input.publicProfile) {
    if (existing)
      await updateTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'public_creator_profiles',
        rowId: ctx.actor.userId,
        data: { displayName: '' },
      });
    return done({ published: false });
  }
  const name = input.displayName.trim().slice(0, 100);
  if (!name) return failure('invalid');
  if (existing)
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'public_creator_profiles',
      rowId: ctx.actor.userId,
      data: { displayName: name },
    });
  else
    await ctx.tables.createRow({
      databaseId: ctx.databaseId,
      tableId: 'public_creator_profiles',
      rowId: ctx.actor.userId,
      data: { userId: ctx.actor.userId, displayName: name },
      // Projeção pública sanitizada: leitura para autenticadas, escrita só backend.
      permissions: ['read("users")'],
    });
  return done({ published: true });
}
