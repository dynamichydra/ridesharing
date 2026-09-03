import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { CashCollection } from "../types";
import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/utils";

export function formatCurrencyAmount(minor: number, currency: string = "INR") {
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${code} ${(minor / 100).toFixed(2)}`;
  }
}

export function getCashCollectionColumns(
  onVerify?: (id: string) => void
): ColumnDef<CashCollection>[] {
  return [
    {
      accessorKey: "rideId",
      header: "Ride ID",
      cell: ({ row }) => (
        <Link
          to={`/rides?rideId=${row.original.rideId}`}
          className="font-mono text-xs text-primary hover:underline font-semibold"
        >
          {row.original.rideId.slice(0, 8)}...
        </Link>
      ),
    },
    {
      accessorKey: "driverId",
      header: "Driver",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">
            {row.original.driverName || "Driver"}
          </span>
          <Link
            to={`/drivers/${row.original.driverId}`}
            className="font-mono text-[11px] text-muted-foreground hover:underline"
          >
            {row.original.driverPhone || `${row.original.driverId.slice(0, 8)}...`}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "currencyCode",
      header: "Currency",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[11px] font-semibold bg-accent/40 uppercase">
          {row.original.currencyCode || "INR"}
        </Badge>
      ),
    },
    {
      accessorKey: "expectedAmountMinor",
      header: "Expected (Meter)",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {formatCurrencyAmount(row.original.expectedAmountMinor, row.original.currencyCode)}
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
              {formatCurrencyAmount(row.original.collectedAmountMinor, row.original.currencyCode)}
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
          {formatCurrencyAmount(row.original.platformCommissionMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { status } = row.original;
        let color = "bg-muted text-muted-foreground";
        if (status === "settled" || status === "reported" || status === "verified")
          color = "bg-emerald-500/15 text-emerald-600";
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const { id, status } = row.original;
        if (status === "settled" || status === "verified") {
          return (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600" /> Settled
            </span>
          );
        }

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onVerify?.(id)}
            className="h-7 px-2 text-xs cursor-pointer"
          >
            Verify & Settle
          </Button>
        );
      },
    },
  ];
}
