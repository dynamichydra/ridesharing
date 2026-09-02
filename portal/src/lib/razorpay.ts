import DM_CORE_CONFIG from "@/constant";

/**
 * Official Razorpay Standard Checkout SDK loader and trigger utility.
 * Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const DEFAULT_RAZORPAY_KEY = DM_CORE_CONFIG.RAZORPAY_KEY_ID;

/**
 * Dynamically loads the official Razorpay checkout script (https://checkout.razorpay.com/v1/checkout.js).
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      return resolve(true);
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Official Razorpay Standard Checkout options interface.
 */
export interface RazorpayStandardOptions {
  key?: string;
  amount?: number | string; // in currency subunits (e.g., 50000 paise for ₹500.00)
  amountMinor?: number; // helper alias
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id?: string;
  orderId?: string; // helper alias
  callback_url?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
  themeColor?: string; // helper alias
  modal?: {
    backdropclose?: boolean;
    escape?: boolean;
    handleback?: boolean;
    confirm_close?: boolean;
    ondismiss?: () => void;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  onSuccess?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  onDismiss?: () => void;
}

// Backward-compatible alias
export type RazorpayCheckoutOptions = RazorpayStandardOptions;

/**
 * Launches the official Razorpay Standard Checkout modal.
 */
export async function openRazorpayCheckout(options: RazorpayStandardOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error("Failed to load official Razorpay SDK. Please check your internet connection.");
  }

  const key = options.key || DEFAULT_RAZORPAY_KEY;
  const rawAmount = options.amount !== undefined ? options.amount : options.amountMinor;
  const amount = typeof rawAmount === "string" ? parseInt(rawAmount, 10) : (rawAmount ?? 0);
  const currency = (options.currency || "INR").toUpperCase();
  const rawOrderId = options.order_id || options.orderId;
  const orderId = rawOrderId && rawOrderId.startsWith("order_") ? rawOrderId : undefined;
  const themeColor = options.theme?.color || options.themeColor || "#0f172a";

  const successCallback = options.handler || options.onSuccess;
  const dismissCallback = options.modal?.ondismiss || options.onDismiss;

  const rzpOptions: Record<string, any> = {
    key,
    amount,
    currency,
    name: options.name || "RideShare Platform",
    description: options.description || "Checkout Payment",
    image: options.image || undefined,
    order_id: orderId || undefined,
    callback_url: options.callback_url || undefined,
    prefill: {
      name: options.prefill?.name || "Customer",
      email: options.prefill?.email || "customer@example.com",
      contact: options.prefill?.contact || "9999999999",
    },
    notes: options.notes || {},
    theme: {
      color: themeColor,
    },
    handler: function (response: any) {
      if (successCallback) {
        successCallback({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || orderId,
          razorpay_signature: response.razorpay_signature,
        });
      }
    },
    modal: {
      backdropclose: options.modal?.backdropclose ?? false,
      escape: options.modal?.escape ?? true,
      handleback: options.modal?.handleback ?? true,
      confirm_close: options.modal?.confirm_close ?? true,
      ondismiss: function () {
        if (dismissCallback) {
          dismissCallback();
        }
      },
    },
  };

  const rzp = new window.Razorpay(rzpOptions);
  rzp.open();
}
