import { pgEnum } from 'drizzle-orm/pg-core';

export const rideStatusEnum = pgEnum('ride_status', [
  'scheduled', 'requested', 'searching', 'accepted', 'arriving', 'arrived', 'started', 'completed', 'cancelled', 'expired',
]);

export const userStatusEnum = pgEnum('user_status', [
  'pending', 'active', 'suspended', 'deleted',
]);

export const driverStatusEnum = pgEnum('driver_status', [
  'pending_onboarding', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted',
]);

export const driverRegistrationStatusEnum = pgEnum('driver_registration_status', [
  'new', 'mobile_verified', 'email_verified', 'registration_in_progress',
  'documents_pending', 'pending_review', 'under_verification',
  'approved', 'rejected', 'suspended', 'active', 'inactive',
]);

export const driverApprovalStatusEnum = pgEnum('driver_approval_status', [
  'pending', 'approved', 'rejected',
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

export const legacySubscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'inactive', 'expired', 'cancelled',
]);

export const subscriptionStatusEnum = pgEnum('subscription_lifecycle_status', [
  'pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'payment_failed', 'inactive',
]);

export const commissionBaseEnum = pgEnum('commission_base', [
  'gross_fare', 'fare_after_booking_fee', 'driver_fare', 'net_fare',
]);

export const subscriptionEventTypeEnum = pgEnum('subscription_event_type', [
  'created', 'trial_started', 'activated', 'renewed', 'payment_succeeded', 'payment_failed',
  'plan_changed', 'paused', 'resumed', 'cancelled', 'expired', 'grace_period_entered',
]);

export const commercialAuditActionEnum = pgEnum('commercial_audit_action', [
  'create', 'update', 'version_created', 'activate', 'deactivate', 'archive',
]);

export const commercialEntityTypeEnum = pgEnum('commercial_entity_type', [
  'subscription_plan', 'subscription_plan_version', 'commission_rule', 'commission_rule_version', 'entitlement',
]);

export const rideOfferStatusEnum = pgEnum('ride_offer_status', [
  'pending', 'accepted', 'rejected', 'expired', 'superseded', 'cancelled',
]);

export const dispatchJobStatusEnum = pgEnum('dispatch_job_status', [
  'pending', 'searching', 'driver_offered', 'assigned', 'exhausted', 'cancelled', 'failed',
]);

export const assignmentTypeEnum = pgEnum('assignment_type', [
  'automatic', 'manual', 'reassign', 'airport_queue', 'reservation',
]);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'active', 'completed', 'cancelled_by_driver', 'cancelled_by_rider', 'cancelled_by_admin', 'reassigned',
]);

export const matchingPolicyScopeEnum = pgEnum('matching_policy_scope', [
  'global', 'country', 'city', 'zone', 'service_type',
]);

export const airportQueueStatusEnum = pgEnum('airport_queue_status', [
  'active', 'paused', 'closed',
]);

export const airportQueueEntryStatusEnum = pgEnum('airport_queue_entry_status', [
  'waiting', 'offered', 'dispatched', 'paused', 'left', 'timed_out',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending', 'confirmed', 'cancelled', 'fulfilled', 'expired',
]);

// ─── Fare Engine Enums ────────────────────────────────────────────────────────

/**
 * Generic active/inactive status used on NEW pricing/fare tables.
 * Existing tables continue to use their isActive boolean field.
 */
export const statusEnum = pgEnum('status', [
  'active',
  'inactive',
]);

/**
 * Pricing rule value type.
 * fixed      = flat amount in minor currency units
 * percentage = applied as percent of fare component
 * multiplier = applied as a multiplier (e.g. 1.2 = 20% more)
 */
export const valueTypeEnum = pgEnum('value_type', [
  'fixed',
  'percentage',
  'multiplier',
]);

/**
 * Direction for pricing/toll rules.
 */
export const directionEnum = pgEnum('direction', [
  'pickup',
  'drop',
  'both',
]);

/**
 * Direction for airport-specific pricing rules.
 */
export const airportDirectionEnum = pgEnum('airport_direction', [
  'pickup',
  'drop',
  'both',
]);

/**
 * Coupon discount type.
 */
export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', [
  'fixed',
  'percentage',
]);

/**
 * Lifecycle status for a coupon redemption.
 * reserved  = locked during ride booking (prevents double-use)
 * redeemed  = fully applied to a completed ride
 * cancelled = ride was cancelled, lock released
 * expired   = lock TTL elapsed without a ride completing
 */
export const couponRedemptionStatusEnum = pgEnum('coupon_redemption_status', [
  'reserved',
  'redeemed',
  'cancelled',
  'expired',
]);

/**
 * Fare quote lifecycle status.
 */
export const fareQuoteStatusEnum = pgEnum('fare_quote_status', [
  'active',
  'used',
  'expired',
  'cancelled',
]);

/**
 * Pricing plan scope.
 * city = plan applies to the entire city
 * zone = plan applies to a specific sub-zone within the city
 */
export const pricingScopeEnum = pgEnum('pricing_scope', [
  'city',
  'zone',
]);

/**
 * Surge calculation mode.
 * ratio  = automatic demand/supply ratio triggers surge
 * manual = admin sets surge multiplier directly
 */
export const surgeModeEnum = pgEnum('surge_mode', [
  'ratio',
  'manual',
]);

/**
 * Source used to calculate route distance for a fare.
 */
export const fareDistanceSourceEnum = pgEnum('fare_distance_source', [
  'google',
  'mapbox',
  'openroute',
  'haversine',
  'manual',
]);
