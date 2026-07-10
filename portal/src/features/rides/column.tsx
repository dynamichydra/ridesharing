import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import type { Ride } from "./types";

export interface RideColumn {
  key: string;
  header: string;
  className?: string;
  render: (ride: Ride) => ReactNode;
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

export function getRideColumns(onViewDetails: (ride: Ride) => void): RideColumn[] {
  return [
    {
      key: "details",
      header: "Ride Details",
      render: (ride) => (
        <>
          <div className="font-semibold text-foreground">ID: {ride.id.slice(0, 8)}...</div>
          <div className="text-xs text-muted-foreground">
            {new Date(ride.requestedAt).toLocaleString()}
          </div>
        </>
      ),
    },
    {
      key: "pickup",
      header: "Pickup Address",
      className: "max-w-xs truncate",
      render: (ride) => (
        <span title={ride.pickupAddress || ""}>
          {ride.pickupAddress || `(${ride.pickupLat}, ${ride.pickupLng})`}
        </span>
      ),
    },
    {
      key: "drop",
      header: "Drop Address",
      className: "max-w-xs truncate",
      render: (ride) => (
        <span title={ride.dropAddress || ""}>
          {ride.dropAddress || `(${ride.dropLat}, ${ride.dropLng})`}
        </span>
      ),
    },
    {
      key: "fare",
      header: "Fare Metrics",
      render: (ride) => (
        <>
          <div className="font-medium text-foreground">
            Final: ₹{ride.finalFare || ride.estimatedFare || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            Est: ₹{ride.estimatedFare || "—"} | {ride.distanceKm || "0"} km
          </div>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (ride) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(ride.status)}`}>
          {ride.status}
        </span>
      ),
    },
    {
      key: "telemetry",
      header: "Telemetry",
      className: "text-right",
      render: (ride) => (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(ride)}
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