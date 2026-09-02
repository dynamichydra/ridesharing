import DM_CORE_CONFIG from "@/constant";

/**
 * Razorpay Standard Checkout SDK loader and trigger utility.
 */

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const DEFAULT_RAZORPAY_TEST_KEY = DM_CORE_CONFIG.RAZORPAY_KEY_ID;

/**
 * Dynamically loads the official Razorpay checkout script.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOptions {
  key?: string;
  amountMinor: number;
  currency?: string;
  name?: string;
  description?: string;
  orderId?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  themeColor?: string;
  isDummy?: boolean;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  onDismiss?: () => void;
}

/**
 * Launches the Razorpay Standard Checkout modal or simulates a dummy success.
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const {
    key = DEFAULT_RAZORPAY_TEST_KEY,
    amountMinor,
    currency = "INR",
    name = "RideShare Portal",
    description = "Wallet / Service Top-up",
    orderId,
    prefill = {},
    notes = {},
    themeColor = "#0f172a",
    isDummy = false,
    onSuccess,
    onDismiss,
  } = options;

  if (isDummy) {
    // Instant simulation mode for dev/sandbox demo
    setTimeout(() => {
      onSuccess({
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: orderId || `order_mock_${Date.now()}`,
        razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2)}`,
      });
    }, 800);
    return;
  }

  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
  }

  const rzp = new window.Razorpay({
    key,
    amount: amountMinor,
    currency: currency.toUpperCase(),
    name,
    description,
    order_id: orderId || undefined,
    prefill: {
      name: prefill.name || "Customer",
      email: prefill.email || "user@example.com",
      contact: prefill.contact || "9999999999",
    },
    notes,
    theme: {
      color: themeColor,
    },
    handler: function (response: any) {
      onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  });

  rzp.open();
}

/**
 * Common test VPAs and netbanking options for dummy testing.
 */
export const RAZORPAY_TEST_ACCOUNTS = [
  { label: "Success UPI (VPA)", upiId: "success@razorpay" },
  { label: "Failure UPI (VPA)", upiId: "failure@razorpay" },
  { label: "HDFC Test Netbanking", bank: "HDFC" },
  { label: "SBI Test Netbanking", bank: "SBIN" },
];
