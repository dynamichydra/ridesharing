import { loadStripe, type Stripe } from "@stripe/stripe-js";
import DM_CORE_CONFIG from "@/constant";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Returns a singleton Promise of the initialized Stripe instance.
 * Accepts a custom publishable key or falls back to DM_CORE_CONFIG / environment key.
 */
export function getStripe(publishableKey?: string): Promise<Stripe | null> {
  const key = publishableKey || DM_CORE_CONFIG.STRIPE_PUBLISHABLE_KEY;
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
