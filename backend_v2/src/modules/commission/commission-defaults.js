/**
 * Platform commission when no admin-configured rate applies (no commission rule and no
 * city-type fare rate). The subscription is optional:
 *
 *   Free (no plan)        → 15% commission per ride
 *   Active subscription   →  5% commission per ride
 *
 * Admins override these per country/city/city type/vehicle (commission_rules,
 * city_type_fares) and per plan (entitlements.commissionRate). Every code fallback in the
 * fare, payment and earnings paths reads from here — don't hard-code a percentage elsewhere.
 */
export const DEFAULT_NON_SUBSCRIBER_COMMISSION_RATE = '0.1500';
export const DEFAULT_SUBSCRIBER_COMMISSION_RATE = '0.0500';

/** Default rate as a number for a driver with (true) or without (false) an active plan. */
export function defaultCommissionRate(isSubscriber) {
  return Number(isSubscriber ? DEFAULT_SUBSCRIBER_COMMISSION_RATE : DEFAULT_NON_SUBSCRIBER_COMMISSION_RATE);
}
