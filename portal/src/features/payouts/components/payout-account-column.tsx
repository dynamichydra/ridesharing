import type { ColumnDef } from "@tanstack/react-table";
import { Check, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PayoutAccount } from "../types";
import { formatDateTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        value
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {label}
    </span>
  );
}

interface Actions {
  onApprove: (account: PayoutAccount) => void;
  onReject: (account: PayoutAccount) => void;
  onPayNow: (account: PayoutAccount) => void;
}

export function getPayoutAccountColumns({ onApprove, onReject, onPayNow }: Actions): ColumnDef<PayoutAccount>[] {
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
      accessorKey: "gateway",
      header: "Gateway",
      cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.gateway}</span>,
    },
    {
      id: "stripeStatus",
      header: "Stripe Connect",
      cell: ({ row }) =>
        row.original.gateway === "stripe" ? (
          <div className="flex gap-1.5">
            <BoolBadge value={row.original.stripeDetailsSubmitted} label="Details" />
            <BoolBadge value={row.original.stripePayoutsEnabled} label="Payouts" />
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: "razorpayPayoutMethod",
      header: "Payout Method",
      cell: ({ row }) => {
        const acct = row.original;
        if (acct.gateway !== "razorpay") return <span className="text-muted-foreground text-xs">—</span>;
        if (acct.razorpayFundAccountType === "vpa" && acct.upiId) {
          return (
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                UPI
              </span>
              <div className="text-xs text-muted-foreground mt-0.5">{acct.upiId}</div>
            </div>
          );
        }
        if (acct.accountNumberLast4) {
          return (
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                Bank
              </span>
              <div className="text-xs text-muted-foreground mt-0.5">
                {acct.bankName || "Bank"} ••••{acct.accountNumberLast4}
              </div>
            </div>
          );
        }
        return <span className="text-muted-foreground text-xs">Not submitted</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "rejectionReason",
      header: "Rejection Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">
          {row.original.rejectionReason || "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Requested At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (row.original.status === "pending") {
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                onClick={() => onApprove(row.original)}
              >
                <Check className="h-3 w-3" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-red-600 hover:text-red-700 cursor-pointer"
                onClick={() => onReject(row.original)}
              >
                <X className="h-3 w-3" /> Reject
              </Button>
            </div>
          );
        }
        if (row.original.status === "approved") {
          return (
            <Button size="sm" variant="outline" className="h-7 gap-1 cursor-pointer" onClick={() => onPayNow(row.original)}>
              <Zap className="h-3 w-3" /> Pay Now
            </Button>
          );
        }
        return null;
      },
    },
  ];
}
