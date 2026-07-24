import type { ColumnDef } from "@tanstack/react-table";
import type { Refund } from "../types";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const REFUND_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function getRefundColumns(): ColumnDef<Refund>[] {
  return [
    {
      id: "paymentId",
      header: "Payment",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.paymentId.slice(0, 8)}...</span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {formatMinor(row.original.amountMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">
          {row.original.reason || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            REFUND_STATUS_STYLES[row.original.status] || REFUND_STATUS_STYLES.pending
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "initiatedByType",
      header: "Initiated By",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground capitalize">{row.original.initiatedByType}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];
}
