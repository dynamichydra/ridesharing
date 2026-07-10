import { Eye, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Driver } from "./types";

export interface DriverColumn {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (driver: Driver) => React.ReactNode;
}

interface DriverColumnHandlers {
  onOpenDocs: (driver: Driver) => void;
  onToggleBlock: (driver: Driver) => void;
}


export function getDriverColumns({
  onOpenDocs,
  onToggleBlock,
}: DriverColumnHandlers): DriverColumn[] {
  return [
    {
      key: "details",
      header: "Driver details",
      render: (driver) => (
        <>
          <div className="font-semibold text-foreground flex items-center gap-2">
            {driver.name || "Unnamed Driver"}
            {driver.isOnline && (
              <span className="flex h-2 w-2 rounded-full bg-green-500" title="Online" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">{driver.phone}</div>
          <div className="text-xs text-amber-500 font-medium">
            ★ {driver.rating} ({driver.totalRides} rides)
          </div>
        </>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (driver) =>
        driver.vehicleNumber ? (
          <div>
            <div className="font-medium text-foreground">{driver.vehicleNumber}</div>
            <div className="text-xs text-muted-foreground">
              {driver.vehicleModel} ({driver.vehicleYear})
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">No Vehicle Registered</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (driver) =>
        driver.isBlocked ? (
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
      key: "approval",
      header: "Approval",
      render: (driver) => (
        <span
          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            driver.approvalStatus === "approved"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : driver.approvalStatus === "rejected"
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {driver.approvalStatus}
        </span>
      ),
    },
    {
      key: "subscription",
      header: "Subscription",
      render: (driver) => (
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            driver.subscriptionStatus === "active"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
              : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {driver.subscriptionStatus}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right space-x-2",
      render: (driver) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDocs(driver)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Review
          </Button>
          <Button
            variant={driver.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={() => onToggleBlock(driver)}
            className="text-xs font-medium cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            {driver.isBlocked ? "Unblock" : "Block"}
          </Button>
        </>
      ),
    },
  ];
}