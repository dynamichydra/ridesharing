import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import toast from "react-hot-toast";

/**
 * Official Stripe PaymentElement component implementation for Production.
 * Reference: https://docs.stripe.com/payments/accept-a-payment?payment-ui=elements&client=react
 */

export interface StripeCardFormProps {
  amountMinor: number;
  currencyCode: string;
  clientSecret?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function PaymentElementCheckoutForm({
  amountMinor,
  currencyCode,
  customerName,
  customerEmail,
  customerPhone,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success`,
          payment_method_data: {
            billing_details: {
              name: customerName || undefined,
              email: customerEmail || undefined,
              phone: customerPhone || undefined,
            },
          },
        },
        redirect: "if_required",
      });

      if (result.error) {
        const msg = result.error.message || "Payment failed via Stripe";
        setErrorMessage(msg);
        toast.error(msg);
      } else if (
        result.paymentIntent &&
        (result.paymentIntent.status === "succeeded" || result.paymentIntent.status === "processing")
      ) {
        toast.success(`Payment of ${formattedAmount} succeeded via Stripe!`);
        onSuccess(result.paymentIntent.id);
      }
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred with Stripe checkout";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-1.5">
        <div className="p-3 rounded-lg border border-border bg-background">
          <PaymentElement
            options={{
              layout: "tabs",
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
          <ShieldCheck className="h-4 w-4 text-green-600" /> Secure 256-bit encrypted with Stripe
        </span>
        <span className="font-bold text-foreground text-sm">{formattedAmount}</span>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isProcessing}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!stripe || !elements || isProcessing}
          className="cursor-pointer gap-1.5"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" /> Pay {formattedAmount}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Official Stripe Elements Container Provider
 */
export function StripeCardForm(props: StripeCardFormProps) {
  const stripePromise = getStripe();

  const options: StripeElementsOptions = props.clientSecret
    ? {
        clientSecret: props.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0f172a",
          },
        },
      }
    : {
        mode: "payment",
        amount: Math.max(props.amountMinor, 50),
        currency: (props.currencyCode || "USD").toLowerCase(),
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0f172a",
          },
        },
      };

  return (
    <Elements stripe={stripePromise} options={options} key={props.clientSecret || `${props.amountMinor}_${props.currencyCode}`}>
      <PaymentElementCheckoutForm {...props} />
    </Elements>
  );
}

export const StripePaymentElement = StripeCardForm;
