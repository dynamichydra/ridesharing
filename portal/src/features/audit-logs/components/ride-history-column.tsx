import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import type { RideStatusHistoryEntry } from "../types";
import { formatDateTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function statusBadge(status: string) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
        STATUS_STYLES[status] || "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function getRideStatusHistoryColumns(): ColumnDef<RideStatusHistoryEntry>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "When",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "rideId",
      header: "Ride",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.rideId.slice(0, 8)}...</span>
      ),
    },
    {
      id: "transition",
      header: "Status Change",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.fromStatus ? statusBadge(row.original.fromStatus) : (
            <span className="text-[11px] text-muted-foreground">new</span>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {statusBadge(row.original.toStatus)}
        </div>
      ),
    },
    {
      accessorKey: "changedBy",
      header: "Changed By",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="text-foreground capitalize">{row.original.changedBy || "system"}</span>
          {row.original.changedById && (
            <div className="text-[10px] text-muted-foreground font-mono">{row.original.changedById.slice(0, 8)}...</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">{row.original.reason || "—"}</span>
      ),
    },
  ];
}
