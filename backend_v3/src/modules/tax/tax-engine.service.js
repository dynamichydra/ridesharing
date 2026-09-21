import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { taxRules, taxCalculations } from '../../../drizzle/schema/index.js';

/**
 * Compute taxes for a ride fare or subscription and store an immutable snapshot for financial audits.
 */
export async function calculateAndSnapshotTax({
  referenceType,
  referenceId,
  countryId = null,
  stateId = null,
  cityId = null,
  taxableAmountMinor,
  currencyCode = 'INR',
}) {
  let taxRate = 0.05; // 5% default GST / VAT if no custom rule found
  let taxRuleId = null;
  let taxRegion = 'standard';
  let taxBreakdown = { vat: 5.0 };

  // 1. Try city-specific rule
  let rule = null;
  if (cityId) {
    [rule] = await db.select().from(taxRules)
      .where(and(eq(taxRules.cityId, cityId), eq(taxRules.isActive, true)))
      .limit(1);
  }

  // 2. Try state-specific rule
  if (!rule && stateId) {
    [rule] = await db.select().from(taxRules)
      .where(and(eq(taxRules.stateId, stateId), eq(taxRules.isActive, true)))
      .limit(1);
  }

  // 3. Try country-wide rule
  if (!rule && countryId) {
    [rule] = await db.select().from(taxRules)
      .where(and(eq(taxRules.countryId, countryId), eq(taxRules.isActive, true)))
      .limit(1);
  }

  if (rule) {
    taxRate = parseFloat(rule.rate || 0.05);
    taxRuleId = rule.id;
    taxRegion = rule.name || 'standard';
    taxBreakdown = { name: rule.name, rate: rule.rate, isInclusive: rule.isInclusive };
  }

  const taxAmountMinor = Math.round(taxableAmountMinor * taxRate);

  const [calculation] = await db.insert(taxCalculations).values({
    referenceType,
    referenceId,
    countryId,
    stateId,
    taxRegion,
    taxRuleId,
    taxRuleVersion: 1,
    taxRate,
    taxableAmountMinor,
    taxAmountMinor,
    taxBreakdown,
    currencyCode,
  }).returning();

  return calculation;
}
