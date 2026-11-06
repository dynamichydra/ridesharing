import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, countries } from '../../../drizzle/schema/index.js';

/**
 * A rider account's money rules come from the country it registered in — nothing else (not
 * the pickup location, not provider routing tables, not what the app asks for):
 *
 *   India  → INR, Razorpay
 *   Canada → CAD, Stripe
 *
 * Every rider payment path (saved cards, ride fares, wallet top-ups) resolves its currency and
 * gateway through here. Drivers keep the general routing in payment-region.service.js.
 */
export const RIDER_PAYMENT_PROFILES = Object.freeze({
  IN: Object.freeze({ countryCode: 'IN', currencyCode: 'INR', currencySymbol: '₹', gateway: 'razorpay' }),
  CA: Object.freeze({ countryCode: 'CA', currencyCode: 'CAD', currencySymbol: 'CA$', gateway: 'stripe' }),
});

export function paymentProfileForCountry(isoCode) {
  return RIDER_PAYMENT_PROFILES[String(isoCode || '').toUpperCase()] || null;
}

export async function getRiderPaymentProfile(riderId) {
  const [row] = await db.select({ iso: countries.isoCode })
    .from(users).leftJoin(countries, eq(users.countryId, countries.id))
    .where(eq(users.id, riderId)).limit(1);
  const profile = paymentProfileForCountry(row?.iso);
  if (!profile) {
    throw {
      statusCode: 409,
      code: 'ACCOUNT_COUNTRY_MISSING',
      message: 'Your account has no supported country. Please log in again.',
    };
  }
  return profile;
}

export function assertRiderGateway(profile, gatewayName) {
  if (gatewayName && String(gatewayName).toLowerCase() !== profile.gateway) {
    throw {
      statusCode: 400,
      code: 'GATEWAY_NOT_ALLOWED',
      message: `Your ${profile.countryCode === 'IN' ? 'Indian' : 'Canadian'} account pays with ${profile.gateway === 'razorpay' ? 'Razorpay' : 'Stripe'} only.`,
    };
  }
}

export function assertRiderCurrency(profile, currencyCode) {
  if (currencyCode && String(currencyCode).toUpperCase() !== profile.currencyCode) {
    throw {
      statusCode: 400,
      code: 'CURRENCY_NOT_ALLOWED',
      message: `Your account can only pay in ${profile.currencyCode}.`,
    };
  }
}
