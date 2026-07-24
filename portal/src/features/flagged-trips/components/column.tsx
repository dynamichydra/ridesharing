import type { ColumnDef } from "@tanstack/react-table";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlaggedTrip } from "../types";

function formatMinor(amountMinor: number | null, currencyCode: string | null): string {
  if (amountMinor == null || !currencyCode) return "—";
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  adjusted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

interface Actions {
  onApprove: (trip: FlaggedTrip) => void;
  onAdjust: (trip: FlaggedTrip) => void;
}

export function getFlaggedTripColumns({ onApprove, onAdjust }: Actions): ColumnDef<FlaggedTrip>[] {
  return [
    {
      id: "ride",
      header: "Ride",
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {row.original.pickupAddress || "—"} → {row.original.dropAddress || "—"}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.rideId.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      id: "fares",
      header: "Estimated / Actual",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatMinor(row.original.estimatedFareMinor, row.original.currencyCode)}
          {" / "}
          {formatMinor(row.original.actualFareMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "deviationPct",
      header: "Deviation",
      cell: ({ row }) => (
        <span className="font-semibold text-red-600">{Number(row.original.deviationPct).toFixed(1)}%</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-xs text-muted-foreground capitalize">{row.original.reason.replace(/_/g, " ")}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[row.original.status]}`}>
          {row.original.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "billed",
      header: "Billed As",
      cell: ({ row }) => {
        if (row.original.status === "approved") return <span className="text-xs text-muted-foreground">Actual fare</span>;
        if (row.original.status === "adjusted") {
          return (
            <span className="text-xs text-foreground font-medium">
              {formatMinor(row.original.adjustedFareMinor, row.original.currencyCode)}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Flagged At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "pending_review" ? (
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
              className="h-7 gap-1 cursor-pointer"
              onClick={() => onAdjust(row.original)}
            >
              <SlidersHorizontal className="h-3 w-3" /> Adjust
            </Button>
          </div>
        ) : null,
    },
  ];
}
