import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInitiateRefund } from "../hooks";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

interface PaymentContext {
  paymentId: string;
  remainingMinor: number;
  currencyCode: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When opened from a specific payment row, the Payment ID is fixed and the refundable
  // amount is capped/shown. When opened from the standalone Refunds page, both are blank —
  // an admin working a support ticket types the payment ID in by hand.
  payment?: PaymentContext;
}

export function InitiateRefundDialog({ open, onOpenChange, payment }: Props) {
  const initiateMutation = useInitiateRefund();
  const [paymentId, setPaymentId] = useState(payment?.paymentId ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setPaymentId(payment?.paymentId ?? "");
      setAmount(payment ? (payment.remainingMinor / 100).toFixed(2) : "");
      setReason("");
    }
  }, [open, payment]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(Number(amount) * 100);
    if (!paymentId.trim() || !amountMinor || amountMinor <= 0) return;
    initiateMutation.mutate(
      { paymentId: paymentId.trim(), amountMinor, reason: reason.trim() || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-primary" /> Initiate Refund
          </DialogTitle>
          <DialogDescription>
            {payment
              ? `Refunding payment ${payment.paymentId.slice(0, 8)}... — up to ${formatMinor(payment.remainingMinor, payment.currencyCode)} refundable.`
              : "Refunds are processed immediately against the payment gateway. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rf-payment-id">Payment ID</Label>
            <Input
              id="rf-payment-id"
              placeholder="Payment UUID"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              disabled={!!payment}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rf-amount">Amount</Label>
            <Input
              id="rf-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={payment ? payment.remainingMinor / 100 : undefined}
              placeholder="e.g. 100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rf-reason">Reason (Optional)</Label>
            <Textarea
              id="rf-reason"
              placeholder="e.g. rider complaint, duplicate charge"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={initiateMutation.isPending} className="cursor-pointer">
              {initiateMutation.isPending ? "Processing…" : "Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
