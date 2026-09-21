import type { ColumnDef } from "@tanstack/react-table";
import { Bike, Edit2, Ban, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleModel } from "../types";

interface Props {
  vehicleTypeNameById: Record<string, string | undefined>;
  onEdit: (vm: VehicleModel) => void;
  onToggleActive: (vm: VehicleModel) => void;
}

export function getVehicleModelColumns({
  vehicleTypeNameById,
  onEdit,
  onToggleActive,
}: Props): ColumnDef<VehicleModel>[] {
  return [
    {
      accessorKey: "name",
      header: "Brand / Model",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            <Bike className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.original.brand}</div>
            <div className="text-xs text-muted-foreground">{row.original.name}</div>
          </div>
        </div>
      ),
    },
    {
      id: "vehicleType",
      header: "Vehicle Type",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {vehicleTypeNameById[row.original.vehicleTypeId] || "—"}
        </span>
      ),
    },
    {
      accessorKey: "sortOrder",
      header: "Sort Order",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.sortOrder}</span>,
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
            title="Edit vehicle model"
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
