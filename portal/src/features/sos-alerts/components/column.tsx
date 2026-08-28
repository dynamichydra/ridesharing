import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import type { SosAlert } from "../types";
import { Link } from "react-router-dom";

export function getSosAlertColumns({
  onResolve,
}: {
  onResolve: (alert: SosAlert) => void;
}): ColumnDef<SosAlert>[] {
  return [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isTriggered = row.original.status === "TRIGGERED";
        return (
          <Badge
            className={`flex items-center gap-1.5 font-semibold ${
              isTriggered
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-emerald-500/15 text-emerald-600 border-none"
            }`}
          >
            {isTriggered ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> ACTIVE SOS
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> RESOLVED
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "userType",
      header: "Initiator",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Badge variant="outline" className="w-fit font-medium uppercase text-xs">
            {row.original.userType}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
            {row.original.userId}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "rideId",
      header: "Ride ID",
      cell: ({ row }) => (
        <Link
          to={`/rides?rideId=${row.original.rideId}`}
          className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          {row.original.rideId}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      accessorKey: "coordinates",
      header: "GPS Location",
      cell: ({ row }) => {
        const { latitude, longitude } = row.original;
        if (!latitude || !longitude) return <span className="text-xs text-muted-foreground">No GPS</span>;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        return (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </a>
        );
      },
    },
    {
      accessorKey: "triggeredAt",
      header: "Triggered Time",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.triggeredAt).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "resolutionNotes",
      header: "Resolution Notes",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
          {row.original.resolutionNotes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const isTriggered = row.original.status === "TRIGGERED";
        return (
          <Button
            size="sm"
            variant={isTriggered ? "destructive" : "outline"}
            disabled={!isTriggered}
            onClick={() => onResolve(row.original)}
            className="h-8 text-xs font-semibold cursor-pointer"
          >
            {isTriggered ? "Resolve SOS" : "Resolved"}
          </Button>
        );
      },
    },
  ];
}
