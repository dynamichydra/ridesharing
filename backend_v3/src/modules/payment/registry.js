import { razorpayGateway } from './gateways/razorpay.gateway.js';
import { stripeGateway } from './gateways/stripe.gateway.js';
import {
  COUNTRY_GATEWAY_MAP,
  CURRENCY_GATEWAY_MAP,
  DEFAULT_FALLBACK_GATEWAY,
} from './gateway-routing.config.js';

class GatewayRegistry {
  constructor() {
    this.gateways = new Map();
    // Default built-in gateways
    this.register(razorpayGateway);
    this.register(stripeGateway);
  }

  /**
   * Register a new gateway adapter.
   * To add a new provider (e.g. PayPal, Flutterwave, Adyen), simply call this with the adapter instance.
   * @param {Object} adapter
   */
  register(adapter) {
    if (!adapter || !adapter.name) {
      throw new Error('Invalid gateway adapter: missing "name"');
    }
    this.gateways.set(adapter.name.toLowerCase(), adapter);
    return this;
  }

  /**
   * Retrieves a gateway adapter by name.
   * @param {string} name
   */
  get(name) {
    if (!name) return null;
    return this.gateways.get(name.toLowerCase()) || null;
  }

  /**
   * Resolves the gateway for a country code (e.g. 'CA' -> stripe, 'IN' -> razorpay).
   * @param {string} countryCode - ISO 2-letter country code
   */
  getForCountry(countryCode) {
    if (!countryCode) return this.get(DEFAULT_FALLBACK_GATEWAY);
    const gatewayName = COUNTRY_GATEWAY_MAP[countryCode.toUpperCase()] || DEFAULT_FALLBACK_GATEWAY;
    return this.get(gatewayName);
  }

  /**
   * Resolves the gateway for a currency code (e.g. 'CAD' -> stripe, 'INR' -> razorpay).
   * @param {string} currencyCode
   */
  getForCurrency(currencyCode) {
    if (!currencyCode) return this.get(DEFAULT_FALLBACK_GATEWAY);
    const gatewayName = CURRENCY_GATEWAY_MAP[currencyCode.toUpperCase()] || DEFAULT_FALLBACK_GATEWAY;
    return this.get(gatewayName);
  }

  /**
   * Resolves the gateway for a driver object based on driver's country ISO code or fallback.
   * @param {Object} driver
   * @param {string} [countryCode]
   */
  getForDriver(driver, countryCode = null) {
    const code = countryCode || driver?.countryIsoCode || driver?.countryCode;
    return this.getForCountry(code);
  }

  /**
   * Lists all registered gateways.
   */
  list() {
    return Array.from(this.gateways.values());
  }
}

export const gatewayRegistry = new GatewayRegistry();
export default gatewayRegistry;
