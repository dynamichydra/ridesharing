import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StripeCardForm } from "./stripe-card-form";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { CreditCard, Zap } from "lucide-react";
import toast from "react-hot-toast";

export interface PaymentCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  defaultAmount?: number; // in normal currency units e.g. 50.00
  currencyCode?: string; // 'USD', 'CAD', 'INR', etc.
  gateway?: "stripe" | "razorpay" | "auto";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  clientSecret?: string;
  onSuccess: (paymentDetails: {
    gateway: "stripe" | "razorpay";
    paymentId: string;
    amount: number;
    currency: string;
  }) => void;
}

export function PaymentCheckoutModal({
  open,
  onOpenChange,
  title,
  description,
  defaultAmount = 50,
  currencyCode = "USD",
  gateway = "stripe",
  customerName = "Customer",
  customerEmail = "customer@example.com",
  customerPhone,
  clientSecret,
  onSuccess,
}: PaymentCheckoutModalProps) {
  const amountNumeric = defaultAmount || 0;
  const amountMinor = Math.round(amountNumeric * 100);

  // Directly resolve gateway: default is Stripe for card modal
  const activeGateway =
    gateway === "auto"
      ? currencyCode.toUpperCase() === "INR"
        ? "razorpay"
        : "stripe"
      : gateway;

  const modalTitle =
    title ||
    (activeGateway === "stripe"
      ? "Stripe Payment"
      : "Razorpay Checkout");

  const modalDescription =
    description ||
    (activeGateway === "stripe"
      ? "Complete your payment securely with Stripe"
      : "Complete your payment via Razorpay Standard Checkout");

  const handleRazorpayDirect = async () => {
    try {
      await openRazorpayCheckout({
        amountMinor,
        currency: currencyCode,
        name: "RideShare Platform",
        description: modalDescription,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        onSuccess: (res) => {
          toast.success(`Razorpay payment successful! ID: ${res.razorpay_payment_id}`);
          onSuccess({
            gateway: "razorpay",
            paymentId: res.razorpay_payment_id,
            amount: amountNumeric,
            currency: currencyCode,
          });
          onOpenChange(false);
        },
        onDismiss: () => {
          toast("Payment cancelled", { icon: "ℹ️" });
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to launch Razorpay checkout");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg flex items-center gap-2">
              {activeGateway === "stripe" ? (
                <>
                  <CreditCard className="h-5 w-5 text-primary" /> {modalTitle}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-blue-600" /> {modalTitle}
                </>
              )}
            </DialogTitle>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              {currencyCode.toUpperCase()} {amountNumeric.toFixed(2)}
            </Badge>
          </div>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {activeGateway === "stripe" ? (
            <StripeCardForm
              clientSecret={clientSecret}
              amountMinor={amountMinor}
              currencyCode={currencyCode}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              onSuccess={(piId) => {
                onSuccess({
                  gateway: "stripe",
                  paymentId: piId,
                  amount: amountNumeric,
                  currency: currencyCode,
                });
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Click below to launch Razorpay Standard Checkout for {currencyCode} {amountNumeric.toFixed(2)}.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRazorpayDirect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 cursor-pointer"
                >
                  Open Razorpay Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
