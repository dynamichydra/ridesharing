import { pgEnum } from 'drizzle-orm/pg-core';

export const rideStatusEnum = pgEnum('ride_status', [
  'scheduled', 'requested', 'searching', 'accepted', 'arriving', 'started', 'completed', 'cancelled', 'expired',
]);

export const userStatusEnum = pgEnum('user_status', [
  'pending', 'active', 'suspended', 'deleted',
]);

export const driverStatusEnum = pgEnum('driver_status', [
  'pending_onboarding', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted',
]);

export const fareSplitStatusEnum = pgEnum('fare_split_status', [
  'pending', 'accepted', 'declined', 'cancelled', 'expired',
]);

export const fareSplitPaymentStatusEnum = pgEnum('fare_split_payment_status', [
  'pending', 'paid', 'failed',
]);

export const referralStatusEnum = pgEnum('referral_status', [
  'pending', 'completed', 'expired',
]);

export const sosAlertStatusEnum = pgEnum('sos_alert_status', [
  'triggered', 'acknowledged', 'resolved',
]);

export const contentFlagStatusEnum = pgEnum('content_flag_status', [
  'pending', 'approved', 'redacted', 'banned',
]);

export const savedPlaceLabelEnum = pgEnum('saved_place_label', [
  'home', 'work', 'favorite', 'custom',
]);

export const driverDocumentStatusEnum = pgEnum('driver_document_status', [
  'pending', 'approved', 'rejected', 'expired',
]);

export const payoutAccountStatusEnum = pgEnum('payout_account_status', [
  'pending', 'approved', 'rejected',
]);

export const flaggedTripStatusEnum = pgEnum('flagged_trip_status', [
  'pending_review', 'under_investigation', 'dismissed', 'action_taken',
]);

export const rideDisputeStatusEnum = pgEnum('ride_dispute_status', [
  'open', 'under_review', 'resolved_refunded', 'resolved_rejected', 'escalated',
]);

export const disputeStatusEnum = pgEnum('dispute_status', [
  'opened', 'investigating', 'resolved_buyer_win', 'resolved_seller_win', 'closed',
]);

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending', 'processing', 'completed', 'failed', 'reversed',
]);

export const payoutBatchStatusEnum = pgEnum('payout_batch_status', [
  'processing', 'completed', 'failed',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'requested', 'pending', 'completed', 'failed', 'rejected',
]);

export const reconciliationMismatchStatusEnum = pgEnum('reconciliation_mismatch_status', [
  'open', 'resolved', 'ignored',
]);

export const reconciliationRunStatusEnum = pgEnum('reconciliation_run_status', [
  'completed', 'failed',
]);

export const walletStatusEnum = pgEnum('wallet_status', [
  'active', 'frozen',
]);

export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
  'requested', 'processing', 'completed', 'rejected', 'failed',
]);

export const idempotencyStatusEnum = pgEnum('idempotency_status', [
  'pending', 'completed', 'failed',
]);

export const outboxStatusEnum = pgEnum('outbox_status', [
  'pending', 'processing', 'published', 'failed',
]);

export const webhookStatusEnum = pgEnum('webhook_status', [
  'received', 'processed', 'failed',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'inactive', 'expired', 'cancelled',
]);

export const rideOfferStatusEnum = pgEnum('ride_offer_status', [
  'pending', 'accepted', 'rejected', 'expired',
]);
