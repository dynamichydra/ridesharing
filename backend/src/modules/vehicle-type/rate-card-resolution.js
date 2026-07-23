/**
 * Pure tier-selection logic for resolveRateCard() — no DB access, so the
 * fallback order (exact → category → global) is directly unit-testable
 * without a Postgres connection. The DB-touching wrapper
 * (vehicle-type-pricing.service.js) fetches each tier's row (or null) and
 * hands them to this function to decide which one wins.
 */
export function pickResolvedTier(fuelType, { exact, category, global }) {
  if (fuelType && exact) return { ...exact, resolutionTier: 'exact' };
  if (category) return { ...category, resolutionTier: 'category' };
  if (global) return { ...global, resolutionTier: 'global' };
  return null;
}
