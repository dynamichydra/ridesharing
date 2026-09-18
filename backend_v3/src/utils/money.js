/**
 * All money in the system is stored as an integer in "minor units" (paise, cents)
 * paired with an ISO 4217 currencyCode — never as a bare decimal. These helpers are
 * the only place that should convert between major-unit input/display and minor-unit storage.
 */

// Exponent = number of minor units per major unit. Default 2 (paise/cents) covers
// INR and CAD; listed explicitly so a future zero- or three-decimal currency doesn't
// silently get the wrong scale.
const CURRENCY_EXPONENT = {
  INR: 2,
  CAD: 2,
  USD: 2,
};

export function minorUnitExponent(currencyCode) {
  return CURRENCY_EXPONENT[currencyCode] ?? 2;
}

/** Convert a major-unit amount (e.g. "149.50", 149.5) to an integer minor-unit amount. */
export function toMinor(amount, currencyCode) {
  const exp = minorUnitExponent(currencyCode);
  return Math.round(parseFloat(amount) * 10 ** exp);
}

/** Convert an integer minor-unit amount back to a major-unit number (e.g. 14950 -> 149.5). */
export function fromMinor(amountMinor, currencyCode) {
  const exp = minorUnitExponent(currencyCode);
  return amountMinor / 10 ** exp;
}

/** Round a minor-unit amount to the nearest `incrementMinor` (e.g. CAD cash rounding to 5 cents). */
export function roundToIncrement(amountMinor, incrementMinor = 1) {
  if (!incrementMinor || incrementMinor <= 1) return Math.round(amountMinor);
  return Math.round(amountMinor / incrementMinor) * incrementMinor;
}

/** Locale-aware display string, e.g. formatMoney(14950, 'CAD') -> "CA$149.50". */
export function formatMoney(amountMinor, currencyCode, locale = 'en') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode })
    .format(fromMinor(amountMinor, currencyCode));
}
