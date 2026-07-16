import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Driver } from "../types";

interface Props {
  onViewDetail: (driver: Driver) => void;
  onToggleBlock: (driver: Driver) => void;
}

export function getDriverColumns({ onViewDetail, onToggleBlock }: Props): ColumnDef<Driver>[] {
  return [
    {
      id: "details",
      header: "Driver details",
      cell: ({ row }) => (
        <>
          <div className="font-semibold text-foreground flex items-center gap-2">
            {row.original.name || "Unnamed Driver"}
            {row.original.isOnline && (
              <span className="flex h-2 w-2 rounded-full bg-green-500" title="Online" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.phone}</div>
          <div className="text-xs text-amber-500 font-medium">
            ★ {row.original.rating} ({row.original.totalRides} rides)
          </div>
        </>
      ),
    },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) =>
        row.original.vehicleNumber ? (
          <div>
            <div className="font-medium text-foreground">{row.original.vehicleNumber}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.vehicleModel} ({row.original.vehicleYear})
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">No Vehicle Registered</span>
        ),
    },
    {
      accessorKey: "isBlocked",
      header: "Status",
      cell: ({ row }) =>
        row.original.isBlocked ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Blocked
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ),
    },
    {
      accessorKey: "approvalStatus",
      header: "Approval",
      cell: ({ row }) => (
        <span
          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            row.original.approvalStatus === "approved"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : row.original.approvalStatus === "rejected"
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {row.original.approvalStatus}
        </span>
      ),
    },
    {
      accessorKey: "subscriptionStatus",
      header: "Subscription",
      cell: ({ row }) => (
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            row.original.subscriptionStatus === "active"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
              : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {row.original.subscriptionStatus}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(row.original)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Review
          </Button>
          <Button
            variant={row.original.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={() => onToggleBlock(row.original)}
            className="text-xs font-medium cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            {row.original.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      ),
    },
  ];
}
