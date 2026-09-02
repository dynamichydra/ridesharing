import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StripeCardForm } from "./stripe-card-form";
import { openRazorpayCheckout, RAZORPAY_TEST_ACCOUNTS } from "@/lib/razorpay";
import { CreditCard, Zap, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export interface PaymentCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  defaultAmount?: number; // in normal currency units e.g. 50.00
  currencyCode?: string; // 'INR', 'USD', 'CAD'
  gateway?: "stripe" | "razorpay" | "auto";
  customerName?: string;
  customerEmail?: string;
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
  title = "Complete Payment",
  description = "Secure checkout via integrated payment gateway",
  defaultAmount = 50,
  currencyCode = "INR",
  gateway: initialGateway = "auto",
  customerName = "Customer",
  customerEmail = "customer@example.com",
  onSuccess,
}: PaymentCheckoutModalProps) {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [isDummyMode, setIsDummyMode] = useState(true);

  // Determine active gateway
  const resolvedGateway =
    initialGateway === "auto"
      ? currencyCode.toUpperCase() === "INR"
        ? "razorpay"
        : "stripe"
      : initialGateway;

  const [activeGateway, setActiveGateway] = useState<"stripe" | "razorpay">(resolvedGateway);

  const amountNumeric = parseFloat(amount) || 0;
  const amountMinor = Math.round(amountNumeric * 100);

  const handleRazorpayTrigger = async () => {
    if (amountMinor <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await openRazorpayCheckout({
        amountMinor,
        currency: currencyCode,
        name: "RideShare Platform",
        description: title,
        prefill: {
          name: customerName,
          email: customerEmail,
        },
        isDummy: isDummyMode,
        onSuccess: (res) => {
          toast.success(
            `Razorpay ${isDummyMode ? "Dummy" : "Live"} payment successful! ID: ${res.razorpay_payment_id}`,
          );
          onSuccess({
            gateway: "razorpay",
            paymentId: res.razorpay_payment_id,
            amount: amountNumeric,
            currency: currencyCode,
          });
          onOpenChange(false);
        },
        onDismiss: () => {
          toast("Payment cancelled by user", { icon: "ℹ️" });
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to launch Razorpay checkout");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <Badge
              variant={isDummyMode ? "outline" : "default"}
              className={isDummyMode ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300" : "bg-green-600 text-white"}
            >
              {isDummyMode ? "Sandbox / Dummy Mode" : "Production Live"}
            </Badge>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount input & Mode Switcher */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount ({currencyCode})</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
              />
            </div>
            <div>
              <Button
                type="button"
                variant={isDummyMode ? "secondary" : "outline"}
                size="sm"
                className="w-full text-xs gap-1.5 cursor-pointer"
                onClick={() => setIsDummyMode(!isDummyMode)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isDummyMode ? "Switch to Live Mode" : "Switch to Dummy Mode"}
              </Button>
            </div>
          </div>

          {/* Gateway selector tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Select Payment Method / Gateway</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveGateway("stripe")}
                className={`p-3 rounded-lg border flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  activeGateway === "stripe"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <CreditCard className="h-4 w-4 text-primary" /> Stripe Elements
                </div>
                <span className="text-[11px] text-muted-foreground">Cards (CAD, USD, EUR, etc.)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGateway("razorpay")}
                className={`p-3 rounded-lg border flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  activeGateway === "razorpay"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Zap className="h-4 w-4 text-blue-600" /> Razorpay Standard
                </div>
                <span className="text-[11px] text-muted-foreground">UPI / Netbanking (INR)</span>
              </button>
            </div>
          </div>

          {/* Active gateway content */}
          {activeGateway === "stripe" ? (
            <div className="pt-2 border-t border-border">
              <StripeCardForm
                amountMinor={amountMinor}
                currencyCode={currencyCode === "INR" ? "USD" : currencyCode}
                isDummyMode={isDummyMode}
                onSuccess={(piId) => {
                  onSuccess({
                    gateway: "stripe",
                    paymentId: piId,
                    amount: amountNumeric,
                    currency: currencyCode === "INR" ? "USD" : currencyCode,
                  });
                  onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Razorpay Test VPAs & Banks
                  </span>
                  <span className="text-[10px] text-primary">Pre-configured</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {RAZORPAY_TEST_ACCOUNTS.map((acc) => (
                    <div key={acc.label} className="p-1.5 rounded bg-background border border-border text-[11px]">
                      <span className="font-medium text-foreground block">{acc.label}</span>
                      <span className="text-muted-foreground text-[10px]">{acc.upiId || acc.bank}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-600" /> Powered by Razorpay Standard Checkout
                </span>
                <span className="font-bold text-foreground text-sm">
                  {currencyCode} {amountNumeric.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleRazorpayTrigger} className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white">
                  Launch Razorpay Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
