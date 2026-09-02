import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { CashCollection } from "../types";
import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/utils";

export function getCashCollectionColumns(): ColumnDef<CashCollection>[] {
  return [
    {
      accessorKey: "rideId",
      header: "Ride ID",
      cell: ({ row }) => (
        <Link
          to={`/rides?rideId=${row.original.rideId}`}
          className="font-mono text-xs text-primary hover:underline font-semibold"
        >
          {row.original.rideId}
        </Link>
      ),
    },
    {
      accessorKey: "driverId",
      header: "Driver ID",
      cell: ({ row }) => (
        <Link
          to={`/drivers/${row.original.driverId}`}
          className="font-mono text-xs text-muted-foreground hover:underline"
        >
          {row.original.driverId}
        </Link>
      ),
    },
    {
      accessorKey: "expectedAmountMinor",
      header: "Expected (Meter)",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          ₹{(row.original.expectedAmountMinor / 100).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "collectedAmountMinor",
      header: "Driver Collected",
      cell: ({ row }) => {
        const isMismatch = row.original.collectedAmountMinor !== row.original.expectedAmountMinor;
        return (
          <div className="flex items-center gap-1.5 font-mono text-sm font-semibold">
            <span className={isMismatch ? "text-destructive" : "text-foreground"}>
              ₹{(row.original.collectedAmountMinor / 100).toFixed(2)}
            </span>
            {isMismatch && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        );
      },
    },
    {
      accessorKey: "platformCommissionMinor",
      header: "Platform Commission",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-emerald-600 font-semibold">
          ₹{(row.original.platformCommissionMinor / 100).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { status } = row.original;
        let color = "bg-muted text-muted-foreground";
        if (status === "settled" || status === "reported") color = "bg-emerald-500/15 text-emerald-600";
        if (status === "mismatch") color = "bg-amber-500/15 text-amber-600 font-semibold";
        if (status === "disputed") color = "bg-destructive/15 text-destructive font-semibold";

        return (
          <Badge className={`${color} border-none capitalize`}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
  ];
}
