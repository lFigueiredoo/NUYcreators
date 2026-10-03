export type Attribute = {
  key: string;
  type: 'string' | 'integer' | 'boolean' | 'datetime';
  required: boolean;
  size?: number;
};
export type Collection = {
  id: string;
  attributes: Attribute[];
  unique: string[][];
  indexes: string[][];
};
// ? optional, # integer, ! boolean, @ datetime. Strings default to 255 chars.
function collection(
  id: string,
  fields: string,
  unique: string[][] = [],
  indexes: string[][] = [],
): Collection {
  const attributes = fields.split(' ').map((field): Attribute => {
    const required = !field.endsWith('?');
    const clean = field.replace(/\?$/, '');
    const [key, marker] = clean.split(':');
    return {
      key,
      required,
      type:
        marker === '#'
          ? 'integer'
          : marker === '!'
            ? 'boolean'
            : marker === '@'
              ? 'datetime'
              : 'string',
      size: marker && /^\d+$/.test(marker) ? Number(marker) : 255,
    };
  });
  return { id, attributes, unique, indexes };
}
export const schemaVersion = '001';
export const collections: Collection[] = [
  collection('users', 'authUserId status acceptedTermsVersion consentAt:@', [['authUserId']]),
  collection(
    'profiles',
    'userId name avatarFileId? phone city state birthDate niche creatorType onboardingCompletedAt:@ publicProfile:!',
    [['userId']],
  ),
  collection(
    'social_accounts',
    'userId platform handle? canonicalUrl:2048 externalAccountId? verificationStatus',
    [['userId', 'platform']],
    [['externalAccountId', 'platform']],
  ),
  collection(
    'creator_levels',
    'name minPoints:# maxPoints:#? order:# active:! rulesVersion',
    [['order']],
    [['active', 'order']],
  ),
  collection(
    'challenges',
    'slug name description:10000 imageFileId? platform startsAt:@ endsAt:@ points:# requiredLevelId? participantLimit:#? participantCount:# productId? hashtags:2000? mentions:2000? status campaignId? version:#',
    [['slug']],
    [['status', 'startsAt'], ['campaignId']],
  ),
  collection(
    'challenge_requirements',
    'challengeId type configJson:10000 order:# required:!',
    [],
    [['challengeId', 'order']],
  ),
  collection(
    'challenge_participants',
    'challengeId userId joinedAt:@ status',
    [['challengeId', 'userId']],
    [['userId', 'joinedAt']],
  ),
  collection(
    'challenge_submissions',
    'challengeId participantId userId platform canonicalUrl:2048? contentFingerprint fileId? status revision:# submittedAt:@ reviewedBy? reviewedAt:@? moderationReason:2000?',
    [['contentFingerprint']],
    [
      ['userId', 'submittedAt'],
      ['status', 'submittedAt'],
    ],
  ),
  collection(
    'point_transactions',
    'userId type amount:# referenceId referenceType description:2000 createdAt:@ idempotencyKey rankingDelta:# actorId reversalOf?',
    [['idempotencyKey']],
    [
      ['userId', 'createdAt'],
      ['referenceType', 'referenceId'],
    ],
  ),
  collection(
    'rewards',
    'name type imageFileId? description:10000 pointsCost:# stock:# perUserLimit:# startsAt:@ endsAt:@ status version:#',
    [],
    [['status', 'startsAt']],
  ),
  collection(
    'reward_redemptions',
    'userId rewardId pointsCostSnapshot:# rewardSnapshotJson:10000 status idempotencyKey requestedAt:@ shippingAddressId? trackingCode? stockRestoredAt:@? refundedAt:@?',
    [['idempotencyKey']],
    [
      ['userId', 'requestedAt'],
      ['status', 'requestedAt'],
    ],
  ),
  collection(
    'content_posts',
    'submissionId creatorId caption:5000 publicMediaFileId? categoryIds:2000? productId? publishedAt:@ status',
    [['submissionId']],
    [['status', 'publishedAt'], ['creatorId']],
  ),
  collection('content_likes', 'postId userId', [['postId', 'userId']]),
  collection('content_saves', 'postId userId', [['postId', 'userId']]),
  collection('badges', 'code name description:2000 imageFileId? ruleJson:5000 active:!', [
    ['code'],
  ]),
  collection('user_badges', 'userId badgeId awardedAt:@ referenceId periodKey', [
    ['userId', 'badgeId', 'periodKey'],
  ]),
  collection(
    'notifications',
    'userId type title body:2000 referenceId? readAt:@? eventKey',
    [['eventKey', 'userId']],
    [['userId', '$createdAt']],
  ),
  collection(
    'campaigns',
    'name description:10000 startsAt:@ endsAt:@ status',
    [],
    [['status', 'startsAt']],
  ),
  collection(
    'audit_logs',
    'actorId action entityType entityId affectedUserId? beforeJson:10000? afterJson:10000? reason:2000 occurredAt:@ ip? correlationId',
    [],
    [
      ['entityType', 'entityId'],
      ['actorId', 'occurredAt'],
    ],
  ),
  collection(
    'point_accounts',
    'userId availableBalance:# qualifyingPoints:# levelId? version:# lastTransactionId?',
    [['userId']],
  ),
  collection(
    'ranking_entries',
    'periodKey userId earnedPoints:# lastEarnedAt:@',
    [['periodKey', 'userId']],
    [['periodKey', 'earnedPoints']],
  ),
  collection(
    'submission_history',
    'submissionId revision:# previousStatus? nextStatus actorId reason:2000? payloadSnapshotJson:10000 occurredAt:@',
    [],
    [['submissionId', 'occurredAt']],
  ),
  collection(
    'redemption_history',
    'redemptionId previousStatus? nextStatus actorId reason:2000? occurredAt:@',
    [],
    [['redemptionId', 'occurredAt']],
  ),
  collection('operation_keys', 'actorId operation key requestHash resultId? status', [
    ['actorId', 'operation', 'key'],
  ]),
  collection(
    'outbox_events',
    'eventKey type aggregateId payloadJson:10000 status attempts:# nextAttemptAt:@',
    [['eventKey']],
    [['status', 'nextAttemptAt']],
  ),
  collection(
    'public_creator_profiles',
    'userId displayName publicAvatarId? bio:2000? approvedSocialUrls:5000?',
    [['userId']],
  ),
  collection(
    'shipping_addresses',
    'userId recipient street number complement? district city state postalCode country',
    [],
    [['userId']],
  ),
  collection('products', 'slug name description:5000? imageFileId? status', [['slug']]),
  collection('content_categories', 'slug name active:!', [['slug']]),
  collection('platform_settings', 'key valueJson:10000 public:!', [['key']]),
];
export const buckets = [
  {
    id: 'brand-assets',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'],
    size: 10_000_000,
  },
  {
    id: 'submission-media',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    size: 25_000_000,
  },
  { id: 'community-media', extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4'], size: 25_000_000 },
  { id: 'avatars', extensions: ['jpg', 'jpeg', 'png', 'webp'], size: 5_000_000 },
];
export const team = { id: 'nuy-admins', roles: ['admin', 'moderator', 'fulfillment'] };
export const functionDefinitions = [
  { id: 'complete-onboarding', implemented: true },
  ...[
    'join-challenge',
    'submit-content',
    'moderate-submission',
    'adjust-points',
    'redeem-reward',
    'process-outbox',
    'rebuild-ranking',
  ].map((id) => ({ id, implemented: false })),
];
export const levelSeed = [
  { id: 'exploradora', name: 'Exploradora NUY', minPoints: 0, maxPoints: 500 },
  { id: 'criadora', name: 'Criadora NUY', minPoints: 501, maxPoints: 1500 },
  { id: 'inspiradora', name: 'Inspiradora NUY', minPoints: 1501, maxPoints: 3000 },
  { id: 'embaixadora', name: 'Embaixadora NUY', minPoints: 3001, maxPoints: 5000 },
  { id: 'icone', name: 'Ícone NUY', minPoints: 5001, maxPoints: null },
];
