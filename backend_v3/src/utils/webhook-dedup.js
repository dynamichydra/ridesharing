/**
 * Pure decision function — given the existing webhook_events row for a (gateway, eventId,
 * domain) triple (or null if none exists yet), decides whether the webhook route should
 * enqueue processing or short-circuit. Extracted so it's unit-testable without a DB; the
 * actual concurrency-safe guard is the unique constraint + onConflictDoNothing insert in the
 * route (see ride-payment/subscription/rider-subscription .routes.js) — this function
 * documents/tests the intended skip-on-redelivery semantics that insert implements.
 */
export function decideWebhookAction(existingRow) {
  return existingRow ? 'skip' : 'process';
}
