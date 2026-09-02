import { useState } from "react";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Sparkles, CreditCard } from "lucide-react";
import { getStripe, STRIPE_TEST_CARDS } from "@/lib/stripe";
import toast from "react-hot-toast";

interface StripeCardFormProps {
  amountMinor: number;
  currencyCode: string;
  clientSecret?: string;
  isDummyMode?: boolean;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function CardPaymentInner({
  amountMinor,
  currencyCode,
  clientSecret,
  isDummyMode,
  onSuccess,
  onCancel,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedAmount = (amountMinor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currencyCode,
  });

  const handleSimulateDummySuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`Dummy Stripe payment of ${formattedAmount} simulated successfully!`);
      onSuccess(`pi_mock_stripe_${Date.now()}`);
    }, 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDummyMode || !clientSecret) {
      handleSimulateDummySuccess();
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        setErrorMessage(result.error.message || "Payment failed");
        toast.error(result.error.message || "Payment failed");
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        toast.success(`Payment of ${formattedAmount} succeeded via Stripe!`);
        onSuccess(result.paymentIntent.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Payment error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Test card suggestions for quick developer / demo autofill */}
      <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Test Cards (Sandbox)
          </span>
          <span className="text-[10px] text-primary">Click to copy</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {STRIPE_TEST_CARDS.slice(0, 2).map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(c.rawNumber);
                toast.success(`Copied ${c.label} card number`);
              }}
              className="text-left p-1.5 rounded bg-background border border-border hover:border-primary/50 text-[11px] transition-colors cursor-pointer"
            >
              <div className="font-medium text-foreground">{c.label}</div>
              <div className="text-muted-foreground text-[10px] font-mono">{c.number}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-primary" /> Card Details
        </label>
        <div className="p-3 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#0f172a",
                  "::placeholder": {
                    color: "#94a3b8",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-green-600" /> End-to-end encrypted with Stripe
        </span>
        <span className="font-bold text-foreground text-sm">{formattedAmount}</span>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isProcessing} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSimulateDummySuccess}
          disabled={isProcessing}
          className="cursor-pointer text-xs"
        >
          Simulate Test Pass
        </Button>
        <Button type="submit" size="sm" disabled={isProcessing} className="cursor-pointer">
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing...
            </>
          ) : (
            `Pay ${formattedAmount}`
          )}
        </Button>
      </div>
    </form>
  );
}

export function StripeCardForm(props: StripeCardFormProps) {
  const stripePromise = getStripe();

  return (
    <Elements stripe={stripePromise}>
      <CardPaymentInner {...props} />
    </Elements>
  );
}
