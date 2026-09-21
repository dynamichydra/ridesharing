import type { ColumnDef } from "@tanstack/react-table";
import { Car, Edit2, Ban, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleType } from "../types";

interface Props {
  onEdit: (vt: VehicleType) => void;
  onToggleActive: (vt: VehicleType) => void;
}

function formatMinor(amountMinor: number) {
  return (amountMinor / 100).toFixed(2); // assumes a 2-decimal currency, see schema.ts note
}

export function getVehicleTypeColumns({ onEdit, onToggleActive }: Props): ColumnDef<VehicleType>[] {
  return [
    {
      accessorKey: "name",
      header: "Name / Slug",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
            {row.original.icon ? (
              <img src={row.original.icon} alt="" className="h-full w-full object-cover" />
            ) : (
              <Car className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.capacity} Pax</span>
      ),
    },
    {
      id: "baseRate",
      header: "Base Rate",
      cell: ({ row }) => <span className="text-muted-foreground">{formatMinor(row.original.baseRateMinor)}</span>,
    },
    {
      id: "perKmRate",
      header: "Per KM Rate",
      cell: ({ row }) => <span className="text-muted-foreground">{formatMinor(row.original.perKmRateMinor)}</span>,
    },
    {
      id: "perMinRate",
      header: "Per Min Rate",
      cell: ({ row }) => <span className="text-muted-foreground">{formatMinor(row.original.perMinRateMinor)}</span>,
    },
    {
      id: "minFare",
      header: "Min Fare",
      cell: ({ row }) => <span className="text-muted-foreground">{formatMinor(row.original.minFareMinor)}</span>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
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
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(row.original)}
            className="border-border hover:bg-muted cursor-pointer"
            title="Edit vehicle type"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleActive(row.original)}
            className="cursor-pointer"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
