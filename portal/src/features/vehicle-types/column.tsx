import { Car, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleType } from "./types";

export interface VehicleTypeColumn {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (vt: VehicleType) => React.ReactNode;
}

interface VehicleTypeColumnHandlers {
  onEdit: (vt: VehicleType) => void;
  onDelete: (vt: VehicleType) => void;
}

// Column definitions consumed by list.tsx to render the vehicle types table.
export function getVehicleTypeColumns({
  onEdit,
  onDelete,
}: VehicleTypeColumnHandlers): VehicleTypeColumn[] {
  return [
    {
      key: "name",
      header: "Name / Slug",
      cellClassName: "font-medium text-foreground",
      render: (vt) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Car className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">{vt.name}</div>
            <div className="text-xs text-muted-foreground">{vt.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      cellClassName: "text-muted-foreground",
      render: (vt) => `${vt.capacity} Pax`,
    },
    {
      key: "baseRate",
      header: "Base Rate",
      cellClassName: "text-muted-foreground",
      render: (vt) => `₹${vt.baseRate}`,
    },
    {
      key: "perKmRate",
      header: "Per KM Rate",
      cellClassName: "text-muted-foreground",
      render: (vt) => `₹${vt.perKmRate}/km`,
    },
    {
      key: "perMinRate",
      header: "Per Min Rate",
      cellClassName: "text-muted-foreground",
      render: (vt) => `₹${vt.perMinRate}/min`,
    },
    {
      key: "minFare",
      header: "Min Fare",
      cellClassName: "text-muted-foreground",
      render: (vt) => `₹${vt.minFare}`,
    },
    {
      key: "status",
      header: "Status",
      render: (vt) =>
        vt.isActive ? (
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
      headerClassName: "text-right",
      cellClassName: "text-right space-x-2",
      render: (vt) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(vt)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(vt)}
            className="text-xs font-medium cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      ),
    },
  ];
}