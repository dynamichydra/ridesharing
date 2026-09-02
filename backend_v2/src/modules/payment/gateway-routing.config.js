/**
 * Gateway Routing Configuration
 * 
 * Maps Country ISO codes and Currencies to their primary default gateway.
 * Adding a new country or gateway is as simple as adding an entry here.
 */

export const COUNTRY_GATEWAY_MAP = {
  // North America -> Stripe
  CA: 'stripe', // Canada (CAD)
  US: 'stripe', // United States (USD)
  MX: 'stripe', // Mexico (MXN)

  // Europe & UK -> Stripe
  GB: 'stripe', // United Kingdom (GBP)
  DE: 'stripe', // Germany (EUR)
  FR: 'stripe', // France (EUR)
  ES: 'stripe', // Spain (EUR)
  IT: 'stripe', // Italy (EUR)
  NL: 'stripe', // Netherlands (EUR)
  IE: 'stripe', // Ireland (EUR)

  // South Asia -> Razorpay
  IN: 'razorpay', // India (INR)

  // Asia-Pacific -> Stripe
  AU: 'stripe', // Australia (AUD)
  NZ: 'stripe', // New Zealand (NZD)
  SG: 'stripe', // Singapore (SGD)
  JP: 'stripe', // Japan (JPY)
};

export const CURRENCY_GATEWAY_MAP = {
  INR: 'razorpay',
  CAD: 'stripe',
  USD: 'stripe',
  EUR: 'stripe',
  GBP: 'stripe',
  AUD: 'stripe',
  SGD: 'stripe',
  JPY: 'stripe',
  NZD: 'stripe',
};

export const DEFAULT_FALLBACK_GATEWAY = 'razorpay';
