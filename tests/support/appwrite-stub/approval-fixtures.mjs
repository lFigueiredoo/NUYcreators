import { createHash } from 'node:crypto';

/** Somente QA local; não modifica as fixtures de outras suítes. */
export function addApprovalFixtures(dataset) {
  dataset.tables.platform_settings ??= [];
  for (const profile of dataset.tables.profiles) profile.userId ??= profile.$id;
  for (const userId of ['viewer-nova', 'viewer-pendente']) {
    const user = dataset.users.find((entry) => entry.id === userId);
    const account = dataset.tables.users.find((entry) => entry.$id === userId);
    account.status = 'pending_review';
    const key = `creator-application:${userId}`;
    dataset.tables.platform_settings.push({
      $id: createHash('sha256').update(key).digest('hex').slice(0, 36),
      $permissions: [`read("user:${userId}")`],
      key,
      public: false,
      valueJson: JSON.stringify({
        userId,
        name: user.name,
        email: user.email,
        requestedAt: dataset.now.toISOString(),
        status: 'pending_review',
        reviewedAt: null,
        reviewedBy: null,
        reason: null,
      }),
    });
  }
}
