import type { ColumnDef } from "@tanstack/react-table";
import type { Payout, PayoutBatch } from "../types";
import { formatDateTime } from "@/lib/utils";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function getPayoutColumns(): ColumnDef<Payout>[] {
  return [
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.driverName || "Unnamed"}</div>
          <div className="text-xs text-muted-foreground">{row.original.driverPhone}</div>
        </div>
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
      accessorKey: "gateway",
      header: "Gateway",
      cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.gateway}</span>,
    },
    {
      id: "batch",
      header: "Source",
      cell: ({ row }) =>
        row.original.batchId ? (
          <span className="text-xs text-muted-foreground font-mono">{row.original.batchId.slice(0, 8)}...</span>
        ) : (
          <span className="text-xs text-muted-foreground">Instant</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            PAYOUT_STATUS_STYLES[row.original.status] || PAYOUT_STATUS_STYLES.pending
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "failureReason",
      header: "Failure Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">
          {row.original.failureReason || "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
  ];
}

const BATCH_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface BatchActions {
  onViewPayouts: (batch: PayoutBatch) => void;
}

export function getPayoutBatchColumns({ onViewPayouts }: BatchActions): ColumnDef<PayoutBatch>[] {
  return [
    {
      accessorKey: "gateway",
      header: "Gateway",
      cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.gateway}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BATCH_STATUS_STYLES[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total Paid",
      // payout_batches has no currencyCode column (a batch is scoped to one gateway, not one
      // currency) — shown in major units without a symbol rather than guessing a currency.
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {(row.original.totalAmountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "driverCount",
      header: "Drivers",
    },
    {
      accessorKey: "createdAt",
      header: "Run At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-xs text-primary hover:underline cursor-pointer"
          onClick={() => onViewPayouts(row.original)}
        >
          View payouts
        </button>
      ),
    },
  ];
}
