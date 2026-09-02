import { CreditCard, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRiderSubscriptionHistory, useRiderSubscriptionPayments } from "../hooks";
import { formatDate, formatDateTime } from "@/lib/utils";

function formatMinor(amountMinor: number | null, currencyCode: string | null): string {
  if (amountMinor == null || !currencyCode) return "—";
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const SUB_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  expired: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  captured: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  created: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
};

interface Props {
  riderId: string;
}

export function RiderSubscriptionPanel({ riderId }: Props) {
  const { data: historyData, isLoading: historyLoading } = useRiderSubscriptionHistory(riderId);
  const { data: paymentsData, isLoading: paymentsLoading } = useRiderSubscriptionPayments(riderId);

  const history = historyData?.MESSAGE || [];
  const payments = paymentsData?.MESSAGE || [];

  return (
    <>
      <Card className="border-border bg-card shadow-sm md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" /> Membership History
          </CardTitle>
          <CardDescription>All rider plans this rider has held, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading membership history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No membership plan history.</p>
          ) : (
            <div className="space-y-3">
              {history.map(({ subscription, plan }) => (
                <div
                  key={subscription.id}
                  className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {plan.name} <span className="text-xs text-muted-foreground capitalize">({plan.type})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(subscription.startDate)}
                      {subscription.endDate ? ` – ${formatDate(subscription.endDate)}` : " – Lifetime"}
                    </div>
                    {subscription.cancelNote && (
                      <div className="text-xs text-red-600 dark:text-red-400">{subscription.cancelNote}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {formatMinor(subscription.amountMinor, subscription.currencyCode)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        SUB_STATUS_STYLES[subscription.status] || SUB_STATUS_STYLES.expired
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" /> Membership Payments
          </CardTitle>
          <CardDescription>Gateway transactions linked to this rider's membership plans.</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment history…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment attempts recorded.</p>
          ) : (
            <div className="space-y-3">
              {payments.map(({ payment, plan }) => (
                <div
                  key={payment.id}
                  className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {plan.name} <span className="text-xs text-muted-foreground uppercase">via {payment.gateway}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(payment.createdAt)}
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
        </CardContent>
      </Card>
    </>
  );
}
