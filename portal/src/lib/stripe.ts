import { loadStripe, type Stripe } from "@stripe/stripe-js";
import DM_CORE_CONFIG from "@/constant";

let stripePromise: Promise<Stripe | null> | null = null;

export const DEFAULT_STRIPE_TEST_KEY = DM_CORE_CONFIG.STRIPE_PUBLISHABLE_KEY;

/**
 * Returns a singleton Promise of the initialized Stripe instance.
 * Accepts a custom publishable key or falls back to DM_CORE_CONFIG / env / default test key.
 */
export function getStripe(publishableKey?: string): Promise<Stripe | null> {
  const key = publishableKey || DM_CORE_CONFIG.STRIPE_PUBLISHABLE_KEY || DEFAULT_STRIPE_TEST_KEY;
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Common test credit cards for sandbox/development testing.
 */
export const STRIPE_TEST_CARDS = [
  { label: "Visa (Success)", number: "4242 •••• •••• 4242", rawNumber: "4242424242424242", exp: "12/28", cvc: "123" },
  { label: "Mastercard (Success)", number: "5555 •••• •••• 4444", rawNumber: "5555555555554444", exp: "12/28", cvc: "123" },
  { label: "Amex (Success)", number: "3782 •••••• 0005", rawNumber: "378282246310005", exp: "12/28", cvc: "1234" },
  { label: "Decline Card", number: "4000 •••• •••• 0002", rawNumber: "4000000000000002", exp: "12/28", cvc: "123" },
];
