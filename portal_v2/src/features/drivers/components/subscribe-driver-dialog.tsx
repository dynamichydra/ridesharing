import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CreditCard } from "lucide-react";
import { useActiveSubscriptionPlans, useInitiateDriverSubscription, useVerifyDriverSubscription } from "@/features/subscriptions/hooks";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { PaymentCheckoutModal } from "@/components/payments/payment-checkout-modal";
import DM_CORE_CONFIG from "@/constant";
import toast from "react-hot-toast";

// TODO: Replace test publishable keys in constant/index.ts with live production keys when going live:
// - DM_CORE_CONFIG.STRIPE_PUBLISHABLE_KEY
// - DM_CORE_CONFIG.RAZORPAY_KEY_ID

interface SubscribeDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  countryId?: string;
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
}

function formatCurrency(amountMinor: number, currencyCode: string) {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function SubscribeDriverDialog({
  open,
  onOpenChange,
  driverId,
  countryId,
  driverName,
  driverEmail,
  driverPhone,
}: SubscribeDriverDialogProps) {
  const { data: plansData, isLoading: isLoadingPlans } = useActiveSubscriptionPlans(countryId);
  const plans = Array.isArray(plansData?.MESSAGE)
    ? plansData.MESSAGE
    : Array.isArray(plansData)
    ? plansData
    : [];

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeCheckoutData, setStripeCheckoutData] = useState<{
    clientSecret?: string;
    orderId: string;
    amount: number;
    currency: string;
    planId: string;
  } | null>(null);

  const initiateMutation = useInitiateDriverSubscription();
  const verifyMutation = useVerifyDriverSubscription();

  const handleSelectAndPay = async (plan: any) => {
    setSelectedPlanId(plan.id);
    setIsProcessing(true);

    try {
      const initResult = await initiateMutation.mutateAsync({
        driverId,
        planId: plan.id,
      });

      const data: any = (initResult as any)?.MESSAGE || initResult;
      const gatewayName = data?.gateway?.toLowerCase() || (plan.currencyCode?.toUpperCase() === "INR" ? "razorpay" : "stripe");

      if (gatewayName === "razorpay") {
        // Trigger Razorpay Checkout
        await openRazorpayCheckout({
          key: data?.keyId || data?.key || DM_CORE_CONFIG.RAZORPAY_KEY_ID,
          amountMinor: data?.amountMinor || plan.priceMinor,
          currency: plan.currencyCode || "INR",
          name: "Driver Subscription",
          description: `${plan.name} (${plan.type})`,
          orderId: data?.gatewayOrderId || (typeof data?.orderId === "string" && data.orderId.startsWith("order_") ? data.orderId : undefined),
          prefill: {
            name: driverName,
            email: driverEmail,
            contact: driverPhone,
          },
          themeColor: "#0f172a",
          onSuccess: async (response) => {
            try {
              const orderRef = response.razorpay_order_id || data?.gatewayOrderId || data?.id || data?.orderId || "";
              await verifyMutation.mutateAsync({
                driverId,
                payload: {
                  planId: plan.id,
                  orderRef,
                  paymentRef: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                },
              });
              toast.success("Subscription activated successfully!");
              onOpenChange(false);
            } catch (err: any) {
              toast.error(err.message || "Failed to verify payment");
            }
          },
        });
      } else {
        // Stripe flow -> open Stripe card modal with client secret
        setStripeCheckoutData({
          clientSecret: data?.clientSecret,
          orderId: data?.gatewayOrderId || data?.id || `stripe_sub_${Date.now()}`,
          amount: (data?.amountMinor || plan.priceMinor) / 100,
          currency: plan.currencyCode || "USD",
          planId: plan.id,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeSuccess = async (paymentDetails: {
    gateway: "stripe" | "razorpay";
    paymentId: string;
    amount: number;
    currency: string;
  }) => {
    if (!stripeCheckoutData) return;
    try {
      await verifyMutation.mutateAsync({
        driverId,
        payload: {
          planId: stripeCheckoutData.planId,
          orderRef: stripeCheckoutData.orderId,
          paymentRef: paymentDetails.paymentId,
        },
      });
      toast.success("Subscription activated successfully!");
      setStripeCheckoutData(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize Stripe subscription");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-6">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Subscribe Driver to Plan
            </DialogTitle>
            <DialogDescription>
              Select a subscription plan for {driverName || "this driver"}. Gateway routing (Razorpay for INR / Stripe for USD/CAD/EUR) is automatically handled.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3 min-h-0">
            {isLoadingPlans ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm">Loading available plans…</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
                No active subscription plans available for this country.
              </div>
            ) : (
              <div className="space-y-2.5">
                {plans.map((plan: any) => {
                  const isRazorpay = plan.currencyCode?.toUpperCase() === "INR";
                  return (
                    <div
                      key={plan.id}
                      className="border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/50 hover:bg-muted/20 transition-all bg-card shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                            {plan.name}
                          </span>
                          <Badge variant="outline" className="capitalize text-[11px] py-0 px-2">
                            {plan.type}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] py-0 px-2 font-normal">
                            {isRazorpay ? "Razorpay" : "Stripe"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                          {plan.durationDays ? `Valid for ${plan.durationDays} days` : "Lifetime access"}
                          {plan.description ? ` · ${plan.description}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <span className="text-base sm:text-lg font-bold text-foreground">
                          {formatCurrency(plan.priceMinor, plan.currencyCode)}
                        </span>
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleSelectAndPay(plan)}
                          className="gap-1.5 cursor-pointer shrink-0 font-medium"
                        >
                          {isProcessing && selectedPlanId === plan.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                          )}
                          Pay & Subscribe
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Modal if Stripe plan is chosen */}
      {stripeCheckoutData && (
        <PaymentCheckoutModal
          open={!!stripeCheckoutData}
          onOpenChange={(isOpen) => !isOpen && setStripeCheckoutData(null)}
          clientSecret={stripeCheckoutData.clientSecret}
          defaultAmount={stripeCheckoutData.amount}
          currencyCode={stripeCheckoutData.currency}
          customerEmail={driverEmail}
          customerName={driverName}
          customerPhone={driverPhone}
          gateway="stripe"
          onSuccess={handleStripeSuccess}
        />
      )}
    </>
  );
}
