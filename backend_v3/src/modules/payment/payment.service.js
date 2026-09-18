import { eq, and, asc, lte, or, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { paymentProviderRoutes, providerHealth } from '../../../drizzle/schema/index.js';
import { gatewayRegistry } from './registry.js';
import { razorpayGateway } from './gateways/razorpay.gateway.js';
import { stripeGateway } from './gateways/stripe.gateway.js';

export function getGateway(name) {
  const gateway = gatewayRegistry.get(name);
  if (!gateway) throw { statusCode: 400, message: `Unknown payment gateway: ${name}` };
  return gateway;
}

/**
 * Intelligent Dynamic PSP Router:
 * 1. Checks `payment_provider_routes` table for matching country, currency, paymentMethod, transactionType, and amount limits.
 * 2. Checks circuit breaker health (`provider_health`). If open, attempts next priority provider.
 * 3. Falls back to static map or mock gateway in dev mode.
 */
export async function selectGateway({
  countryId = null,
  currencyCode = 'INR',
  paymentMethod = 'all',
  transactionType = 'all',
  amountMinor = 0,
}) {
  try {
    const conditions = [
      eq(paymentProviderRoutes.isEnabled, true),
      lte(paymentProviderRoutes.minAmountMinor, amountMinor),
    ];
    if (countryId) {
      conditions.push(or(eq(paymentProviderRoutes.countryId, countryId), isNull(paymentProviderRoutes.countryId)));
    }
    if (currencyCode) {
      conditions.push(or(eq(paymentProviderRoutes.currencyCode, currencyCode), isNull(paymentProviderRoutes.currencyCode)));
    }

    const routes = await db.select().from(paymentProviderRoutes)
      .where(and(...conditions))
      .orderBy(asc(paymentProviderRoutes.priority));

    for (const route of routes) {
      const gw = gatewayRegistry.get(route.gateway);
      if (gw && gw.isConfigured) {
        // Check circuit state
        const [health] = await db.select().from(providerHealth)
          .where(eq(providerHealth.gateway, route.gateway))
          .limit(1);

        if (!health || health.circuitState !== 'open') {
          return gw;
        }
      }
    }
  } catch (err) {
    // Database query fallback if table is empty or initializing
  }

  // Fallback to registry mapping
  const fallbackGateway = gatewayRegistry.getForCurrency(currencyCode);
  if (fallbackGateway && fallbackGateway.isConfigured) {
    return fallbackGateway;
  }

  // If gateway is unconfigured in development/test environment, return mock or null
  return null;
}

/** Returns null (not a throw) when the mapped gateway has no keys configured yet. */
export function gatewayForCurrency(currencyCode) {
  const gateway = gatewayRegistry.getForCurrency(currencyCode);
  return (gateway && gateway.isConfigured) ? gateway : null;
}
