import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRidePaymentHistory } from "../hooks";

function formatMinor(amountMinor: number | null, currencyCode: string | null): string {
  if (amountMinor == null || !currencyCode) return "—";
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  captured: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  created: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string | null;
}

export function RidePaymentHistoryDialog({ open, onOpenChange, rideId }: Props) {
  const { data, isLoading } = useRidePaymentHistory(rideId ?? undefined);
  const attempts = data?.MESSAGE || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Payment History
          </DialogTitle>
          <DialogDescription>
            Every payment attempt recorded for ride {rideId?.slice(0, 8)}…
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payment history…</p>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment attempts recorded for this ride.</p>
        ) : (
          <div className="space-y-3">
            {attempts.map(({ payment }) => (
              <div
                key={payment.id}
                className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground uppercase text-xs">
                    {payment.gateway}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleString()}
                    {payment.gatewayPaymentId && ` · ${payment.gatewayPaymentId}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatMinor(payment.amountMinor, payment.currencyCode)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      PAYMENT_STATUS_STYLES[payment.status] || PAYMENT_STATUS_STYLES.created
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
