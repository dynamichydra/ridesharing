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
  taxableAmountMinor,
  currencyCode = 'INR',
}) {
  let taxRate = 0.05; // 5% default GST / VAT if no custom rule found
  let taxRuleId = null;
  let taxRegion = 'standard';
  let taxBreakdown = { vat: 5.0 };

  if (countryId) {
    const [rule] = await db.select().from(taxRules)
      .where(and(eq(taxRules.countryId, countryId), eq(taxRules.isActive, true)))
      .limit(1);

    if (rule) {
      taxRate = rule.taxRate / 100;
      taxRuleId = rule.id;
      taxRegion = rule.name || 'standard';
      taxBreakdown = { ratePercent: rule.taxRate };
    }
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
