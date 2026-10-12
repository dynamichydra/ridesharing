import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  countries,
  rides,
  paymentMethods,
  paymentProviderRoutes,
  providerHealth,
} from '../../../drizzle/schema/index.js';
import { validateLocationInServiceArea } from '../geo/service-area.service.js';
import { getDefaultCountry, getCountryById } from '../geo/geo.service.js';
import { gatewayRegistry } from './registry.js';
import {
  COUNTRY_GATEWAY_MAP,
  CURRENCY_GATEWAY_MAP,
  DEFAULT_FALLBACK_GATEWAY,
} from './gateway-routing.config.js';
import { env } from '../../config/env.js';

/**
 * Returns the merchant account ID for a given gateway.
 * Tokens and payment methods cannot cross merchant accounts.
 */
export function getMerchantAccountId(gatewayName) {
  const gw = (gatewayName || '').toLowerCase();
  if (gw === 'stripe') {
    return env.STRIPE_ACCOUNT_ID || 'stripe_platform_main';
  }
  if (gw === 'razorpay') {
    return env.RAZORPAY_KEY_ID || 'rzp_india_main';
  }
  return `${gw}_default_merchant`;
}

/**
 * Authoritatively resolves payment region, currency, available gateways,
 * merchant accounts, and payment method rules for a transaction.
 *
 * Untrusted frontend inputs are validated against server-side business rules.
 */
export async function resolvePaymentRegion({
  rideId = null,
  riderId = null,
  pickupLat = null,
  pickupLng = null,
  countryId = null,
  countryCode = null,
  currencyCode = null,
  amountMinor = 0,
  transactionType = 'ride_fare',
} = {}) {
  let resolvedCountryId = null;
  let resolvedCurrency = null;
  let resolvedAmountMinor = amountMinor;
  let governingRide = null;

  // 1. Authoritative resolution from purchased service (e.g. Ride)
  if (rideId) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
    if (!ride) {
      throw { statusCode: 404, message: `Ride with ID ${rideId} not found` };
    }
    if (riderId && ride.riderId !== riderId) {
      throw { statusCode: 403, message: 'You are not authorized to access this ride transaction' };
    }
    governingRide = ride;
    resolvedCountryId = ride.countryId;
    resolvedCurrency = ride.currencyCode;
    resolvedAmountMinor = ride.finalFareMinor ?? ride.estimatedFareMinor ?? 0;
  }

  // 2. Geographic resolution via service boundaries (pickup location)
  if (!resolvedCountryId && pickupLat != null && pickupLng != null) {
    try {
      const geoResult = await validateLocationInServiceArea(parseFloat(pickupLat), parseFloat(pickupLng));
      if (geoResult && geoResult.countryId) {
        resolvedCountryId = geoResult.countryId;
      }
    } catch {
      // Fallback if coordinates outside or geo service unreachable
    }
  }

  // 3. Explicit Country ID resolution
  if (!resolvedCountryId && countryId) {
    resolvedCountryId = countryId;
  }

  // 4. ISO Country Code resolution (e.g. 'IN', 'CA')
  if (!resolvedCountryId && countryCode) {
    const [foundCountry] = await db.select().from(countries)
      .where(eq(countries.isoCode, countryCode.toUpperCase()))
      .limit(1);
    if (foundCountry) {
      resolvedCountryId = foundCountry.id;
      if (!resolvedCurrency) resolvedCurrency = foundCountry.currencyCode;
    }
  }

  // 5. Currency Code resolution fallback
  if (!resolvedCountryId && currencyCode) {
    const [countryForCurrency] = await db.select().from(countries)
      .where(eq(countries.currencyCode, currencyCode.toUpperCase()))
      .limit(1);
    if (countryForCurrency) {
      resolvedCountryId = countryForCurrency.id;
      if (!resolvedCurrency) resolvedCurrency = countryForCurrency.currencyCode;
    }
  }

  // 6. Default Fallback Country
  let countryRow = null;
  if (resolvedCountryId) {
    try {
      countryRow = await getCountryById(resolvedCountryId);
    } catch {
      countryRow = await getDefaultCountry();
    }
  } else {
    countryRow = await getDefaultCountry();
  }

  const country = {
    id: countryRow.id,
    name: countryRow.name,
    isoCode: countryRow.isoCode.toUpperCase(),
    currencyCode: countryRow.currencyCode.toUpperCase(),
  };

  const finalCurrency = (resolvedCurrency || country.currencyCode).toUpperCase();

  // 7. Resolve Available Gateways via dynamic routing & circuit breaker
  const availableGateways = [];
  try {
    const routeConditions = [
      eq(paymentProviderRoutes.isEnabled, true),
      or(eq(paymentProviderRoutes.countryId, country.id), isNull(paymentProviderRoutes.countryId)),
      or(eq(paymentProviderRoutes.currencyCode, finalCurrency), isNull(paymentProviderRoutes.currencyCode)),
    ];

    const routes = await db.select().from(paymentProviderRoutes)
      .where(and(...routeConditions))
      .orderBy(asc(paymentProviderRoutes.priority));

    for (const route of routes) {
      const gw = gatewayRegistry.get(route.gateway);
      if (gw && gw.isConfigured) {
        // Check circuit breaker health
        const [health] = await db.select().from(providerHealth)
          .where(eq(providerHealth.gateway, route.gateway))
          .limit(1);

        if (!health || health.circuitState !== 'open') {
          if (!availableGateways.some(g => g.gateway === route.gateway.toLowerCase())) {
            availableGateways.push({
              gateway: route.gateway.toLowerCase(),
              name: gw.name || route.gateway,
              merchantAccountId: getMerchantAccountId(route.gateway),
              priority: route.priority,
            });
          }
        }
      }
    }
  } catch {
    // Database query fallback
  }

  // If no routes found in DB, consult static configuration map
  if (availableGateways.length === 0) {
    const mappedGatewayName = COUNTRY_GATEWAY_MAP[country.isoCode] ||
      CURRENCY_GATEWAY_MAP[finalCurrency] ||
      DEFAULT_FALLBACK_GATEWAY;

    const gw = gatewayRegistry.get(mappedGatewayName);
    if (gw) {
      availableGateways.push({
        gateway: mappedGatewayName.toLowerCase(),
        name: gw.name || mappedGatewayName,
        merchantAccountId: getMerchantAccountId(mappedGatewayName),
        priority: 1,
      });
    }
  }

  const primaryGateway = availableGateways[0] || null;

  // 8. Determine allowed payment types and required authentication
  const allowedPaymentMethods = ['cash', 'wallet', 'card'];
  const requiredAuthentication = [];
  const providerRestrictions = {};

  if (country.isoCode === 'IN' || finalCurrency === 'INR') {
    allowedPaymentMethods.push('upi', 'netbanking');
    requiredAuthentication.push('otp', '3ds');
    providerRestrictions.razorpay = 'Tokenized cards and recurring payments must comply with RBI guidelines. INR only.';
  } else {
    allowedPaymentMethods.push('apple_pay', 'google_pay');
    requiredAuthentication.push('3ds', 'sca');
    providerRestrictions.stripe = 'Multi-currency international card acceptance with 3D Secure / SCA support.';
  }

  return {
    region: {
      countryId: country.id,
      countryName: country.name,
      countryCode: country.isoCode,
      currencyCode: finalCurrency,
    },
    currencyCode: finalCurrency,
    amountMinor: resolvedAmountMinor,
    availableGateways,
    primaryGateway,
    merchantAccountId: primaryGateway ? primaryGateway.merchantAccountId : null,
    allowedPaymentMethods,
    requiredAuthentication,
    providerRestrictions,
    governingRideId: governingRide ? governingRide.id : null,
  };
}

/**
 * Evaluates whether a saved payment method is eligible for a specific transaction in a resolved region.
 */
export function evaluatePaymentMethodEligibility(savedMethod, resolvedConfig) {
  // 1. Must be active and not revoked
  if (savedMethod.isActive === false || savedMethod.revokedAt) {
    return {
      isEligible: false,
      ineligibilityCode: 'REVOKED',
      ineligibilityReason: 'This payment method has been removed or revoked.',
    };
  }

  // 2. Check card expiration
  if (savedMethod.expiryMonth && savedMethod.expiryYear) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    let expYear = parseInt(savedMethod.expiryYear, 10);
    if (expYear < 100) expYear += 2000;
    const expMonth = parseInt(savedMethod.expiryMonth, 10);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return {
        isEligible: false,
        ineligibilityCode: 'EXPIRED',
        ineligibilityReason: `Card expired in ${savedMethod.expiryMonth}/${savedMethod.expiryYear}.`,
      };
    }
  }

  const methodGateway = (savedMethod.gateway || '').toLowerCase();
  const availableGatewayNames = (resolvedConfig.availableGateways || []).map(g => g.gateway.toLowerCase());

  // 3. Provider support in destination region
  if (!availableGatewayNames.includes(methodGateway)) {
    const regionName = resolvedConfig.region?.countryName || resolvedConfig.region?.countryCode || 'this region';
    const currency = resolvedConfig.currencyCode;
    return {
      isEligible: false,
      ineligibilityCode: 'UNSUPPORTED_GATEWAY',
      ineligibilityReason: `Card provider (${savedMethod.gateway.toUpperCase()}) is not available in ${regionName} (${currency}).`,
    };
  }

  // 4. Merchant account isolation
  // Gateway tokens cannot be used interchangeably across different merchant accounts.
  if (savedMethod.merchantAccountId && resolvedConfig.merchantAccountId) {
    const matchingGatewayObj = resolvedConfig.availableGateways.find(g => g.gateway.toLowerCase() === methodGateway);
    const expectedMerchantId = matchingGatewayObj?.merchantAccountId || resolvedConfig.merchantAccountId;
    if (savedMethod.merchantAccountId !== expectedMerchantId) {
      return {
        isEligible: false,
        ineligibilityCode: 'MERCHANT_ACCOUNT_MISMATCH',
        ineligibilityReason: 'Payment method is registered under a different regional merchant account.',
      };
    }
  }

  // 5. Currency support restrictions
  if (methodGateway === 'razorpay' && resolvedConfig.currencyCode !== 'INR') {
    return {
      isEligible: false,
      ineligibilityCode: 'UNSUPPORTED_CURRENCY',
      ineligibilityReason: 'Razorpay saved cards can only be used for INR transactions.',
    };
  }

  return {
    isEligible: true,
    ineligibilityCode: null,
    ineligibilityReason: null,
  };
}

/**
 * Resolves full transaction payment configuration, lists saved methods with eligibility annotations,
 * and determines preselected payment method without overwriting customer preferences.
 */
export async function resolveCustomerPaymentOptions(userId, context = {}) {
  const resolvedConfig = await resolvePaymentRegion({ ...context, riderId: userId });

  // Load all active saved payment methods for this user
  const savedList = await db.select().from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
    .orderBy(paymentMethods.createdAt);

  let customerPreferredMethod = null;
  let preselectedMethodId = null;
  let preferredUnavailableNotice = null;

  const annotatedMethods = savedList.map((m) => {
    const eligibility = evaluatePaymentMethodEligibility(m, resolvedConfig);
    const isPreferred = !!m.isDefault;

    if (isPreferred) {
      customerPreferredMethod = m;
    }

    return {
      ...m,
      isEligible: eligibility.isEligible,
      ineligibilityCode: eligibility.ineligibilityCode,
      ineligibilityReason: eligibility.ineligibilityReason,
      isPreferred,
    };
  });

  // Preferred method behavior:
  // If customer's preferred method is eligible: preselect it.
  // If customer's preferred method is not eligible:
  // - Retain the customer's preferred method in DB!
  // - Flag that it is unavailable with clear explanation
  // - Preselect 'cash' or require customer selection
  if (customerPreferredMethod) {
    const preferredEval = evaluatePaymentMethodEligibility(customerPreferredMethod, resolvedConfig);
    if (preferredEval.isEligible) {
      preselectedMethodId = customerPreferredMethod.id;
    } else {
      preselectedMethodId = 'cash';
      preferredUnavailableNotice = {
        unavailable: true,
        methodId: customerPreferredMethod.id,
        cardBrand: customerPreferredMethod.cardBrand || 'Card',
        last4: customerPreferredMethod.last4 || '****',
        reason: preferredEval.ineligibilityReason,
      };
    }
  } else {
    // No preferred card saved; default to cash
    preselectedMethodId = 'cash';
  }

  return {
    region: resolvedConfig.region,
    currencyCode: resolvedConfig.currencyCode,
    amountMinor: resolvedConfig.amountMinor,
    availableGateways: resolvedConfig.availableGateways,
    primaryGateway: resolvedConfig.primaryGateway,
    merchantAccountId: resolvedConfig.merchantAccountId,
    allowedPaymentMethods: resolvedConfig.allowedPaymentMethods,
    requiredAuthentication: resolvedConfig.requiredAuthentication,
    providerRestrictions: resolvedConfig.providerRestrictions,
    customerPreferredMethodId: customerPreferredMethod ? customerPreferredMethod.id : null,
    preselectedMethodId,
    preferredUnavailableNotice,
    savedMethods: annotatedMethods,
  };
}
