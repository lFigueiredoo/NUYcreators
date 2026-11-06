import { Query } from 'node-appwrite';
import {
  createTableRow,
  getTableRow,
  isAbsent,
  listTableRows,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { ownerReadPermissions } from '../../../lib/security/permissions';
import { CURRENT_LEGAL_CONSENT_VERSION } from '../../legal/versions';
import {
  done,
  failure,
  requiresStaff,
  type CoreContext,
  type CoreResult,
} from '../../workspace/core/context';
import { recordAudit } from '../../workspace/core/record';
import { inTransaction } from '../../workspace/core/transaction';
import {
  accountApprovalStatus,
  approvalKey,
  approvalRowId,
  parseApprovalRecord,
  type AccountApprovalStatus,
  type ApplicationRecord,
  type CreatorApplication,
  type CreatorApplicationPage,
  type ReviewedAccountStatus,
} from '../domain/approval';

const PAGE_SIZE = 50;
const SCAN_PAGE = 100;
const SCAN_ROOF = 1000;
const validId = (id: string) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id);
const text = (value: unknown) => (typeof value === 'string' ? value : '');

async function optionalRow(
  ctx: CoreContext,
  tableId: string,
  rowId: string,
  transactionId?: string,
) {
  try {
    return await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId,
      rowId,
      transactionId,
    });
  } catch (error) {
    if (isAbsent(error)) return null;
    throw error;
  }
}

function metadata(record: ApplicationRecord) {
  return { key: approvalKey(record.userId), valueJson: JSON.stringify(record), public: false };
}

export type EnsureCreatorApplicationInput = {
  /** Values obtained by the trusted host from Account.get(), not from form fields. */
  name: string;
  email: string;
  authCreatedAt: string;
  consentVersion: string;
  consentAt: string;
};

/** Enroll a new verified identity without reopening an existing decision. */
export async function ensureCreatorApplication(
  ctx: CoreContext,
  input: EnsureCreatorApplicationInput,
): Promise<CoreResult<{ userId: string; status: AccountApprovalStatus }>> {
  const userId = ctx.actor.userId;
  if (!userId) return failure('unauthenticated');
  if (
    !validId(userId) ||
    !input.email.trim() ||
    input.email.length > 320 ||
    input.name.length > 255 ||
    !Number.isFinite(Date.parse(input.authCreatedAt)) ||
    !Number.isFinite(Date.parse(input.consentAt)) ||
    input.consentVersion !== CURRENT_LEGAL_CONSENT_VERSION
  )
    return failure('invalid');

  return inTransaction<{ userId: string; status: AccountApprovalStatus }>(ctx, async (tx) => {
    const current = await optionalRow(ctx, 'users', userId, tx.transactionId);
    if (current && current.authUserId !== userId) return failure('forbidden');
    const status = current ? accountApprovalStatus(current.status) : 'pending_review';
    // Existing active creators are grandfathered. Rejected/suspended accounts
    // cannot reopen themselves by signing up or submitting onboarding again.
    if (current && status !== 'pending_review') return done({ userId, status });
    if (!current) {
      await createTableRow(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'users',
        rowId: userId,
        data: {
          authUserId: userId,
          status: 'pending_review',
          acceptedTermsVersion: input.consentVersion,
          consentAt: input.consentAt,
        },
        permissions: ownerReadPermissions(userId),
        transactionId: tx.transactionId,
      });
    }
    const existing = await optionalRow(
      ctx,
      'platform_settings',
      approvalRowId(userId),
      tx.transactionId,
    );
    if (existing) {
      if (!parseApprovalRecord(existing, userId)) return failure('conflict');
      return done({ userId, status: 'pending_review' as const });
    }
    const record: ApplicationRecord = {
      userId,
      name: input.name.trim(),
      email: input.email.trim(),
      requestedAt: input.authCreatedAt,
      status: 'pending_review',
      reviewedAt: null,
      reviewedBy: null,
      reason: null,
    };
    await createTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'platform_settings',
      rowId: approvalRowId(userId),
      data: metadata(record),
      permissions: ownerReadPermissions(userId),
      transactionId: tx.transactionId,
    });
    await recordAudit(ctx, tx, {
      action: 'creator.application_requested',
      entityType: 'users',
      entityId: userId,
      affectedUserId: userId,
      after: { status: 'pending_review' },
    });
    return done({ userId, status: 'pending_review' as const });
  });
}

export type ReviewCreatorApplicationInput = {
  userId: string;
  decision: 'approve' | 'reject';
  reason?: string;
  expectedStatus: AccountApprovalStatus;
};

/** A decision, its private explanation and its audit are one atomic commit. */
export async function reviewCreatorApplication(
  ctx: CoreContext,
  input: ReviewCreatorApplicationInput,
): Promise<CoreResult<{ userId: string; status: 'active' | 'rejected' }>> {
  const blocked = requiresStaff<{ userId: string; status: 'active' | 'rejected' }>(
    ctx,
    'review-creators',
  );
  if (blocked) return blocked;
  const userId = input.userId.trim();
  const reason = (input.reason ?? '').trim();
  if (
    !validId(userId) ||
    !['approve', 'reject'].includes(input.decision) ||
    reason.length > 2000 ||
    (input.decision === 'reject' && reason.length < 3) ||
    !['pending_review', 'rejected'].includes(input.expectedStatus)
  )
    return failure('invalid');

  return inTransaction(ctx, async (tx) => {
    const current = await optionalRow(ctx, 'users', userId, tx.transactionId);
    if (!current) return failure('not_found');
    if (current.authUserId !== userId) return failure('forbidden');
    const status = accountApprovalStatus(current.status);
    if (status !== input.expectedStatus || !['pending_review', 'rejected'].includes(status))
      return failure('conflict');
    if (status === 'rejected' && input.decision === 'reject') return failure('conflict');
    const [profile, priorRow] = await Promise.all([
      optionalRow(ctx, 'profiles', userId, tx.transactionId),
      optionalRow(ctx, 'platform_settings', approvalRowId(userId), tx.transactionId),
    ]);
    if (
      input.decision === 'approve' &&
      (!profile ||
        profile.userId !== userId ||
        !Number.isFinite(Date.parse(text(profile.onboardingCompletedAt))))
    )
      return failure('invalid');
    const prior = parseApprovalRecord(priorRow, userId);
    if (priorRow && !prior) return failure('conflict');
    const next: 'active' | 'rejected' = input.decision === 'approve' ? 'active' : 'rejected';
    const record: ApplicationRecord = {
      userId,
      name: prior?.name ?? text(profile?.name),
      email: prior?.email ?? '',
      requestedAt: prior?.requestedAt ?? text(current.$createdAt),
      status: next,
      reviewedAt: ctx.now.toISOString(),
      reviewedBy: ctx.actor.userId,
      reason: reason || null,
    };
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'users',
      rowId: userId,
      data: { status: next },
      permissions: ownerReadPermissions(userId),
      transactionId: tx.transactionId,
    });
    const write = priorRow ? updateTableRow : createTableRow;
    await write(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'platform_settings',
      rowId: approvalRowId(userId),
      data: metadata(record),
      permissions: ownerReadPermissions(userId),
      transactionId: tx.transactionId,
    });
    await recordAudit(ctx, tx, {
      action:
        input.decision === 'approve'
          ? 'creator.application_approved'
          : 'creator.application_rejected',
      entityType: 'users',
      entityId: userId,
      affectedUserId: userId,
      reason,
      before: { status },
      after: { status: next },
    });
    return done({ userId, status: next });
  });
}

async function applicationItem(
  ctx: CoreContext,
  user: Row,
  applicationRow: Row | null,
): Promise<CreatorApplication | null> {
  const userId = text(user.$id);
  if (!validId(userId) || user.authUserId !== userId) return null;
  const status = accountApprovalStatus(user.status);
  if (status === 'unavailable') return null;
  const record = parseApprovalRecord(applicationRow, userId);
  // Do not read profiles or social links for legacy active accounts.
  if (status === 'active' && !record) return null;
  if (applicationRow && !record)
    throw Object.assign(new Error('application invalid'), { code: 409 });
  const [profileRow, socialPage] = await Promise.all([
    optionalRow(ctx, 'profiles', userId),
    listTableRows(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'social_accounts',
      queries: [Query.equal('userId', userId), Query.limit(100)],
    }),
  ]);
  const profile =
    profileRow?.userId === userId
      ? {
          name: text(profileRow.name),
          city: text(profileRow.city),
          state: text(profileRow.state),
          niche: text(profileRow.niche),
          creatorType: text(profileRow.creatorType),
          onboardingCompletedAt: text(profileRow.onboardingCompletedAt),
        }
      : null;
  return {
    userId,
    status,
    name: record?.name || profile?.name || '',
    email: record?.email ?? '',
    requestedAt: record?.requestedAt ?? text(user.$createdAt),
    reviewedAt: record?.reviewedAt ?? null,
    reviewedBy: record?.reviewedBy ?? null,
    reason: record?.reason ?? null,
    profile,
    socials: socialPage.rows
      .filter((row) => row.userId === userId)
      .map((row) => ({
        platform: text(row.platform),
        canonicalUrl: text(row.canonicalUrl),
        verificationStatus: text(row.verificationStatus),
      })),
  };
}

/** Stable cursor scan needs no new status index or schema migration. */
export async function loadCreatorApplications(
  ctx: CoreContext,
  input: { status: ReviewedAccountStatus; cursor?: string | null },
): Promise<CoreResult<CreatorApplicationPage>> {
  const blocked = requiresStaff<CreatorApplicationPage>(ctx, 'review-creators');
  if (blocked) return blocked;
  if (
    !['pending_review', 'active', 'rejected'].includes(input.status) ||
    (input.cursor && !validId(input.cursor))
  )
    return failure('invalid');
  const items: CreatorApplication[] = [];
  let scanned = 0;
  let cursor = input.cursor || null;
  try {
    while (scanned < SCAN_ROOF) {
      const page = await listTableRows(ctx.tables, {
        databaseId: ctx.databaseId,
        tableId: 'users',
        queries: [
          Query.orderAsc('$id'),
          Query.limit(SCAN_PAGE),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ],
      });
      if (!page.rows.length) return done({ items, scanned, nextCursor: null });
      const candidates = page.rows.filter(
        (user) => accountApprovalStatus(user.status) === input.status,
      );
      const metadataPage = candidates.length
        ? await listTableRows(ctx.tables, {
            databaseId: ctx.databaseId,
            tableId: 'platform_settings',
            queries: [
              Query.equal(
                '$id',
                candidates.map((user) => approvalRowId(text(user.$id))),
              ),
              Query.limit(SCAN_PAGE),
            ],
          })
        : { rows: [], total: 0 };
      const applications = new Map(metadataPage.rows.map((row) => [text(row.$id), row]));
      for (const [index, user] of page.rows.entries()) {
        cursor = text(user.$id);
        scanned++;
        if (accountApprovalStatus(user.status) === input.status) {
          const item = await applicationItem(
            ctx,
            user,
            applications.get(approvalRowId(cursor)) ?? null,
          );
          if (item) items.push(item);
        }
        if (items.length >= PAGE_SIZE || scanned >= SCAN_ROOF)
          return done({
            items,
            scanned,
            nextCursor:
              index < page.rows.length - 1 || page.rows.length === SCAN_PAGE ? cursor : null,
          });
      }
      if (page.rows.length < SCAN_PAGE) return done({ items, scanned, nextCursor: null });
    }
    return done({ items, scanned, nextCursor: cursor });
  } catch {
    return failure('unavailable', true);
  }
}
