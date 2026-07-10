import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit2, Map, Trash2, XCircle } from "lucide-react";
import type { Zone } from "./types";

export interface ZoneColumn {
  key: string;
  header: string;
  className?: string;
  render: (zone: Zone) => ReactNode;
}

interface ColumnActions {
  onEdit: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}

export function getZoneColumns({ onEdit, onDelete }: ColumnActions): ZoneColumn[] {
  return [
    {
      key: "details",
      header: "Zone Details",
      render: (zone) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Map className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">{zone.name}</div>
            <div className="text-xs text-muted-foreground">{zone.description || "No description"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "capitalize text-muted-foreground",
      render: (zone) => <>{zone.type}</>,
    },
    {
      key: "multiplier",
      header: "Surge Multiplier",
      className: "text-muted-foreground font-semibold",
      render: (zone) => <>{zone.multiplier}x</>,
    },
    {
      key: "coordinatesCount",
      header: "Coordinates Count",
      className: "text-muted-foreground",
      render: (zone) => <>{zone.polygon?.coordinates?.[0]?.length || 0} nodes</>,
    },
    {
      key: "status",
      header: "Status",
      render: (zone) =>
        zone.isActive ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-xs">
            <CheckCircle className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <XCircle className="h-3.5 w-3.5" /> Inactive
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (zone) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(zone)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(zone)}
            className="text-xs font-medium cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}