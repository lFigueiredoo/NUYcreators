/**
 * Núcleo operacional — porta única das operações que gravam.
 *
 * Cada fluxo recebe o cliente já autenticado e a identidade já verificada, e
 * devolve `CoreResult`: sucesso com valor, ou recusa com código de negócio. Os
 * hospedeiros (server actions do Next e Appwrite Functions) traduzem o código
 * para HTTP e para copy — nenhum deles reimplementa regra.
 */
export { joinChallenge, type JoinResult } from './join';
export { submitContent, type SubmitInput, type SubmitResult } from './submit';
export {
  moderateSubmission,
  moderationQueue,
  type ModerateInput,
  type ModerateResult,
  type ModerationDecision,
  type QueueItem,
} from './moderate';
export { adjustPoints, type AdjustInput, type AdjustResult } from './adjust';
export { redeemReward, type RedeemInput, type RedeemResult } from './redeem';
export {
  saveChallenge,
  publishChallenge,
  closeChallenge,
  archiveChallenge,
  saveReward,
  publishReward,
  closeReward,
  setRewardStock,
  saveCampaign,
  type ChallengeResult,
  type RewardResult,
  type CampaignResult,
} from './catalog';
export {
  adminOverview,
  adminChallenges,
  adminChallenge,
  adminRewards,
  adminReward,
  adminCampaigns,
  adminOptions,
  adminSubmissions,
  adminSubmission,
  adminCreators,
  adminCreator,
  adminAudit,
  adminRecentAudit,
  adminReport,
  type CatalogChallenge,
  type CatalogChallengeDetail,
  type CatalogReward,
  type CatalogCampaign,
  type CatalogOptions,
  type AdminSubmission,
  type AdminSubmissionDetail,
  type CreatorSummary,
  type CreatorDetail,
  type AuditEntry,
  type ReportSummary,
} from './console';
export { processOutbox, outboxPending, type OutboxOutcome } from './outbox';
export { rebuildRanking, type RebuildResult } from './rebuild';
export { setNotificationRead, markAllNotificationsRead, deliverNotification } from './notify';
export {
  updateOwnProfile,
  syncPublicProfile,
  type ProfileInput,
  type ProfileResult,
} from './profile';
export {
  done,
  failure,
  allows,
  requiresStaff,
  type CoreActor,
  type CoreCode,
  type CoreContext,
  type CoreFailure,
  type CoreResult,
  type CoreTables,
} from './context';
export { canonicalUrl, digest, periodKey, rowId } from './ids';
export { creditPoints, debitAvailableBalance, readAccount } from './ledger';
export { inTransaction } from './transaction';
export { recordAudit, recordOutbox, type Staged } from './record';
