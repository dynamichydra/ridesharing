import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Ban, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PricingVersion } from "../types";
import { format } from "date-fns";

interface Props {
  onEdit: (pv: PricingVersion) => void;
  onToggleActive: (pv: PricingVersion) => void;
  vehicleTypeNameById?: Record<string, string>;
  countryNameById?: Record<string, string>;
  cityNameById?: Record<string, string>;
  zoneNameById?: Record<string, string>;
}

function formatMinor(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}

export function getPricingVersionColumns({
  onEdit,
  onToggleActive,
  vehicleTypeNameById = {},
  countryNameById = {},
  cityNameById = {},
  zoneNameById = {},
}: Props): ColumnDef<PricingVersion>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "scope",
      header: "Target Scope",
      cell: ({ row }) => {
        const pv = row.original;
        const vehicleName = pv.vehicleTypeId ? vehicleTypeNameById[pv.vehicleTypeId] || "Vehicle" : null;
        const zoneName = pv.zoneId ? zoneNameById[pv.zoneId] : null;
        const cityName = pv.cityId ? cityNameById[pv.cityId] : null;
        const countryName = pv.countryId ? countryNameById[pv.countryId] : null;

        const locationLabel = zoneName
          ? `Zone: ${zoneName}`
          : cityName
          ? `City: ${cityName}`
          : countryName
          ? `Country: ${countryName}`
          : "Global";

        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[11px] font-medium bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                {vehicleName || "All Vehicles"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate" title={locationLabel}>
              {locationLabel}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "baseFareMinor",
      header: "Base Fare",
      cell: ({ row }) => (
        <span className="font-semibold">${formatMinor(row.original.baseFareMinor)}</span>
      ),
    },
    {
      accessorKey: "perKmRateMinor",
      header: "Per KM",
      cell: ({ row }) => <span>${formatMinor(row.original.perKmRateMinor)}</span>,
    },
    {
      accessorKey: "perMinRateMinor",
      header: "Per Min",
      cell: ({ row }) => <span>${formatMinor(row.original.perMinRateMinor)}</span>,
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
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
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
            title="Edit pricing version"
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
