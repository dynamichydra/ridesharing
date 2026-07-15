import type { ColumnDef } from "@tanstack/react-table";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ride } from "../types";

interface Props {
  onViewDetails: (ride: Ride) => void;
}

const statusColorMap: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  started: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function getStatusColor(status: string): string {
  return statusColorMap[status] ?? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
}

export function getRideColumns({ onViewDetails }: Props): ColumnDef<Ride>[] {
  return [
    {
      id: "details",
      header: "Ride Details",
      cell: ({ row }) => (
        <>
          <div className="font-semibold text-foreground">ID: {row.original.id.slice(0, 8)}...</div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.requestedAt).toLocaleString()}
          </div>
        </>
      ),
    },
    {
      id: "pickup",
      header: "Pickup Address",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate" title={row.original.pickupAddress || ""}>
          {row.original.pickupAddress || `(${row.original.pickupLat}, ${row.original.pickupLng})`}
        </span>
      ),
    },
    {
      id: "drop",
      header: "Drop Address",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate" title={row.original.dropAddress || ""}>
          {row.original.dropAddress || `(${row.original.dropLat}, ${row.original.dropLng})`}
        </span>
      ),
    },
    {
      id: "fare",
      header: "Fare Metrics",
      cell: ({ row }) => (
        <>
          <div className="font-medium text-foreground">
            Final: ₹{row.original.finalFare || row.original.estimatedFare || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            Est: ₹{row.original.estimatedFare || "—"} | {row.original.distanceKm || "0"} km
          </div>
        </>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      size: 120,
      minSize: 120,
      maxSize: 120,
      header: () => <div className="w-full text-center">Telemetry</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(row.original)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            View Logs
          </Button>
        </div>
      ),
    },
  ];
}
