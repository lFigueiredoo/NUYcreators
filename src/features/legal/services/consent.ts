import 'server-only';
import {
  databaseId,
  getTableRow,
  operationsConfigured,
  opsTables,
  sessionTables,
  type Row,
} from '@/lib/appwrite/data';
import { CURRENT_LEGAL_CONSENT_VERSION } from '../versions';

export type TermsConsentState = 'accepted' | 'required' | 'unavailable';

export function termsAreCurrent(record: Row | null | undefined, userId: string): boolean {
  if (!record || record.status !== 'active') return false;
  const owner = typeof record.authUserId === 'string' ? record.authUserId : record.userId;
  return owner === userId && record.acceptedTermsVersion === CURRENT_LEGAL_CONSENT_VERSION;
}

export async function currentTermsState(
  secret: string,
  userId: string,
): Promise<TermsConsentState> {
  try {
    const record = await getTableRow(sessionTables(secret), {
      databaseId: databaseId(),
      tableId: 'users',
      rowId: userId,
    });
    return termsAreCurrent(record, userId) ? 'accepted' : 'required';
  } catch (error) {
    if ((error as { code?: number }).code === 404) return 'required';
    console.error('[legal:terms] não foi possível conferir o aceite', {
      code: (error as { code?: number }).code ?? 0,
    });
    return 'unavailable';
  }
}

export async function recordCurrentTermsConsent(secret: string, userId: string): Promise<boolean> {
  if (!operationsConfigured()) return false;
  const state = await currentTermsState(secret, userId);
  if (state === 'accepted') return true;
  if (state === 'unavailable') return false;
  try {
    const current = await getTableRow(sessionTables(secret), {
      databaseId: databaseId(),
      tableId: 'users',
      rowId: userId,
    });
    const owner = typeof current.authUserId === 'string' ? current.authUserId : current.userId;
    if (owner !== userId || current.status !== 'active') return false;
    await opsTables().updateRow({
      databaseId: databaseId(),
      tableId: 'users',
      rowId: userId,
      data: {
        acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
        consentAt: new Date().toISOString(),
      },
    });
    return true;
  } catch (error) {
    console.error('[legal:terms] não foi possível registrar o aceite', {
      code: (error as { code?: number }).code ?? 0,
    });
    return false;
  }
}
