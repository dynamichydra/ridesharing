import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle, UserCheck, XCircle } from "lucide-react";
import type { Rider } from "./types";

export interface RiderColumn {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (rider: Rider) => ReactNode;
}

export interface RiderColumnHandlers {
  onToggleVerify: (rider: Rider) => void;
  onToggleBlock: (rider: Rider) => void;
}

export function getRiderColumns(handlers: RiderColumnHandlers): RiderColumn[] {
  return [
    {
      key: "name",
      header: "Name",
      cellClassName: "font-medium text-foreground flex items-center gap-3",
      render: (rider) => (
        <>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {rider.name ? rider.name[0].toUpperCase() : "U"}
          </div>
          {rider.name || "Unnamed"}
        </>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cellClassName: "text-muted-foreground",
      render: (rider) => rider.phone,
    },
    {
      key: "email",
      header: "Email",
      cellClassName: "text-muted-foreground",
      render: (rider) => rider.email || "—",
    },
    {
      key: "verified",
      header: "Verified",
      render: (rider) =>
        rider.isVerified ? (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="h-4 w-4" /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <XCircle className="h-4 w-4" /> Unverified
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (rider) =>
        rider.isBlocked ? (
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
      key: "rides",
      header: "Rides / Rating",
      cellClassName: "text-muted-foreground font-medium",
      render: (rider) => `${rider.totalRides} rides / ★ ${rider.rating}`,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right space-x-2",
      render: (rider) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlers.onToggleVerify(rider)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {rider.isVerified ? "Unverify" : "Verify"}
          </Button>
          <Button
            variant={rider.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={() => handlers.onToggleBlock(rider)}
            className="text-xs font-medium cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            {rider.isBlocked ? "Unblock" : "Block"}
          </Button>
        </>
      ),
    },
  ];
}