import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, CreditCard, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RidePayment } from "../types";

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

interface RidePaymentColumnActions {
  onRefund: (payment: RidePayment) => void;
}

export function getRidePaymentColumns({ onRefund }: RidePaymentColumnActions): ColumnDef<RidePayment>[] {
  return [
    {
      id: "ride",
      header: "Ride",
      cell: ({ row }) => (
        <>
          <div className="font-semibold text-foreground">ID: {row.original.ride.id.slice(0, 8)}...</div>
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {row.original.ride.pickupAddress || "—"} → {row.original.ride.dropAddress || "—"}
          </div>
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {formatMinor(row.original.payment.amountMinor, row.original.payment.currencyCode)}
        </span>
      ),
    },
    {
      id: "method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.original.ride.paymentMethod;
        if (!method) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium capitalize text-foreground">
            {method === "cash" ? (
              <Banknote className="h-3.5 w-3.5 text-primary" />
            ) : (
              <CreditCard className="h-3.5 w-3.5 text-primary" />
            )}
            {method}
          </span>
        );
      },
    },
    {
      id: "gateway",
      header: "Gateway",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground uppercase">{row.original.payment.gateway}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            PAYMENT_STATUS_STYLES[row.original.payment.status] || PAYMENT_STATUS_STYLES.created
          }`}
        >
          {row.original.payment.status}
        </span>
      ),
    },
    {
      id: "recordedAt",
      header: "Recorded At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.payment.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.payment.status === "captured" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 cursor-pointer"
            onClick={() => onRefund(row.original)}
          >
            <Undo2 className="h-3 w-3" /> Refund
          </Button>
        ) : null,
    },
  ];
}
