import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { currentUser, SESSION_COOKIE } from '@/lib/appwrite/server';
import {
  databaseId,
  getTableRow,
  operationsConfigured,
  opsTables,
  sessionTables,
} from '@/lib/appwrite/data';
import { sessionRoles } from '@/lib/security/authorization';
import { CURRENT_LEGAL_CONSENT_VERSION } from '@/features/legal/versions';
import { ensureCreatorApplication } from '../core/approval';
import { approvalRowId, parseApprovalRecord, type ApplicationRecord } from '../domain/approval';

export type CreatorApprovalState =
  'active' | 'pending_review' | 'rejected' | 'missing' | 'unavailable';

/** A decisão é da linha privada de usuários, nunca de cookie ou preferências. */
export async function currentAccountApproval(
  secret: string,
  userId: string,
): Promise<CreatorApprovalState> {
  try {
    const row = await getTableRow(sessionTables(secret), {
      databaseId: databaseId(),
      tableId: 'users',
      rowId: userId,
    });
    if (row.authUserId !== userId) return 'unavailable';
    if (row.status === 'active' || row.status === 'pending_review' || row.status === 'rejected')
      return row.status;
    return 'unavailable';
  } catch (error) {
    if ((error as { code?: number }).code === 404) return 'missing';
    console.error('[account:approval] consulta indisponível', {
      code: (error as { code?: number }).code ?? 0,
    });
    return 'unavailable';
  }
}

/** Chamada só em actions autenticadas; identidade vem de Account.get(). */
export async function ensureCurrentCreatorApplication(): Promise<boolean> {
  if (!operationsConfigured()) return false;
  const user = await currentUser();
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!user || !secret) return false;
  if ((await sessionRoles(secret, user.$id)).length) return true;
  const result = await ensureCreatorApplication(
    {
      tables: opsTables(),
      databaseId: databaseId(),
      actor: { userId: user.$id, roles: [] },
      now: new Date(),
      correlationId: randomUUID(),
    },
    {
      name: user.name,
      email: user.email,
      authCreatedAt: user.$createdAt,
      consentVersion: CURRENT_LEGAL_CONSENT_VERSION,
      consentAt: new Date().toISOString(),
    },
  );
  return (
    result.ok && (result.value.status === 'active' || result.value.status === 'pending_review')
  );
}

export async function ownCreatorApplication(
  secret: string,
  userId: string,
): Promise<ApplicationRecord | null> {
  try {
    const row = await getTableRow(sessionTables(secret), {
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: approvalRowId(userId),
    });
    return parseApprovalRecord(row, userId);
  } catch {
    return null;
  }
}
