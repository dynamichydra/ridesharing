/**
 * Industrial-grade financial mathematics utility.
 * All monetary amounts are handled strictly in integer minor units (paise, cents, yen).
 * Floating-point arithmetic is never used for currency accumulation or split totals.
 */

export const ROUNDING_POLICIES = {
  ROUND_HALF_UP: 'ROUND_HALF_UP', // Default standard financial rounding (0.5 rounds up)
  ROUND_FLOOR: 'ROUND_FLOOR',     // Always round down (conservative for payouts)
  ROUND_CEIL: 'ROUND_CEIL',       // Always round up
};

/**
 * Multiplies an integer minor amount by a decimal rate (e.g. 0.1500 for 15%)
 * with explicit rounding policy.
 *
 * @param {number|bigint|string} amountMinor - Integer minor units
 * @param {number|string} rateDecimal - Rate as decimal (e.g. "0.1500" or 0.15)
 * @param {string} [policy=ROUNDING_POLICIES.ROUND_HALF_UP] - Rounding policy
 * @returns {number} Result in integer minor units
 */
export function multiplyRate(amountMinor, rateDecimal, policy = ROUNDING_POLICIES.ROUND_HALF_UP) {
  const amt = Number(amountMinor) || 0;
  const rate = typeof rateDecimal === 'string' ? parseFloat(rateDecimal) : Number(rateDecimal) || 0;

  if (amt === 0 || rate === 0) return 0;

  const exact = amt * rate;

  switch (policy) {
    case ROUNDING_POLICIES.ROUND_FLOOR:
      return Math.floor(exact);
    case ROUNDING_POLICIES.ROUND_CEIL:
      return Math.ceil(exact);
    case ROUNDING_POLICIES.ROUND_HALF_UP:
    default:
      // Standard round half up: Math.round in JS does round-half-up for positive numbers
      return Math.round(exact);
  }
}

/**
 * Divides and splits an amount into components while guaranteeing that the sum
 * of all splits exactly equals the original amount (zero-loss penny reconciliation).
 *
 * @param {number} totalMinor
 * @param {number[]} ratios - Array of ratio numbers (e.g. [0.8, 0.2] or [408, 92])
 * @returns {number[]} Array of integer minor splits summing strictly to totalMinor
 */
export function reconcileSplits(totalMinor, ratios) {
  const total = Math.max(0, Math.round(Number(totalMinor) || 0));
  const sumRatios = ratios.reduce((acc, r) => acc + Number(r), 0);

  if (sumRatios === 0) {
    const result = new Array(ratios.length).fill(0);
    if (ratios.length > 0) result[0] = total;
    return result;
  }

  let allocated = 0;
  const splits = ratios.map((ratio, index) => {
    if (index === ratios.length - 1) {
      // Last share gets the exact remainder to prevent rounding drift
      return total - allocated;
    }
    const share = Math.round((total * Number(ratio)) / sumRatios);
    allocated += share;
    return share;
  });

  return splits;
}

/**
 * Validates double-entry ledger balance: SUM(debits) must strictly equal SUM(credits).
 *
 * @param {Array<{direction: 'debit'|'credit', amountMinor: number, currencyCode: string}>} entries
 * @returns {{isBalanced: boolean, totalDebits: number, totalCredits: number, delta: number}}
 */
export function verifyDoubleEntryBalance(entries) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    const amt = Math.max(0, Math.round(Number(entry.amountMinor) || 0));
    if (entry.direction === 'debit') {
      totalDebits += amt;
    } else if (entry.direction === 'credit') {
      totalCredits += amt;
    }
  }

  const delta = totalDebits - totalCredits;
  return {
    isBalanced: delta === 0,
    totalDebits,
    totalCredits,
    delta,
  };
}

/**
 * Formats minor unit money for logs, audit reports, or invoices.
 *
 * @param {number|bigint} amountMinor
 * @param {string} currencyCode
 * @returns {string} e.g. "₹500.00" or "$25.50"
 */
export function formatMinorMoney(amountMinor, currencyCode = 'INR') {
  const major = (Number(amountMinor || 0) / 100).toFixed(2);
  const symbolMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbolMap[currencyCode.toUpperCase()] || `${currencyCode} `;
  return `${symbol}${major}`;
}
