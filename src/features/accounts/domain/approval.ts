import { createHash } from 'node:crypto';

export type AccountApprovalStatus = 'pending_review' | 'active' | 'rejected' | 'unavailable';
export type ReviewedAccountStatus = Exclude<AccountApprovalStatus, 'unavailable'>;

export type ApplicationRecord = {
  userId: string;
  name: string;
  email: string;
  requestedAt: string;
  status: ReviewedAccountStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reason: string | null;
};

export type CreatorApplication = ApplicationRecord & {
  profile: {
    name: string;
    city: string;
    state: string;
    niche: string;
    creatorType: string;
    onboardingCompletedAt: string;
  } | null;
  socials: { platform: string; canonicalUrl: string; verificationStatus: string }[];
};

export type CreatorApplicationPage = {
  items: CreatorApplication[];
  nextCursor: string | null;
  scanned: number;
};

/** Source of truth is the protected users row, never Account preferences. */
export function accountApprovalStatus(value: unknown): AccountApprovalStatus {
  return value === 'active' || value === 'pending_review' || value === 'rejected'
    ? value
    : 'unavailable';
}

export function approvalKey(userId: string): string {
  return `creator-application:${userId}`;
}

export function approvalRowId(userId: string): string {
  return createHash('sha256').update(approvalKey(userId)).digest('hex').slice(0, 36);
}

/** Metadata is personal and private. It never authorizes access by itself. */
export function parseApprovalRecord(
  row: Record<string, unknown> | null | undefined,
  expectedUserId?: string,
): ApplicationRecord | null {
  if (!row || row.public !== false || typeof row.valueJson !== 'string') return null;
  try {
    const value: unknown = JSON.parse(row.valueJson);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (typeof data.userId !== 'string' || !data.userId || data.userId.length > 36) return null;
    if (expectedUserId && data.userId !== expectedUserId) return null;
    if (row.key !== approvalKey(data.userId)) return null;
    const status = accountApprovalStatus(data.status);
    if (status === 'unavailable') return null;
    if (
      typeof data.name !== 'string' ||
      typeof data.email !== 'string' ||
      typeof data.requestedAt !== 'string'
    )
      return null;
    return {
      userId: data.userId,
      name: data.name,
      email: data.email,
      requestedAt: data.requestedAt,
      status,
      reviewedAt: typeof data.reviewedAt === 'string' ? data.reviewedAt : null,
      reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : null,
      reason: typeof data.reason === 'string' ? data.reason : null,
    };
  } catch {
    return null;
  }
}
