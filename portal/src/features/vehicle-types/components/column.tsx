import type { ColumnDef } from "@tanstack/react-table";
import { Car, Edit2, Trash2, CheckCircle, XCircle, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleType, VehicleTypePricing } from "../types";

interface Props {
  pricingMap: Record<string, VehicleTypePricing | undefined>;
  countrySelected: boolean;
  onEdit: (vt: VehicleType) => void;
  onDelete: (vt: VehicleType) => void;
  onEditPricing: (vt: VehicleType) => void;
}

function formatMinor(amountMinor: number, currencyCode: string) {
  const amount = amountMinor / 100; // assumes a 2-decimal currency, see schema.ts note
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(
      amount
    );
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function rateCell(
  field: keyof VehicleTypePricing,
  pricingMap: Record<string, VehicleTypePricing | undefined>,
  countrySelected: boolean
) {
  return ({ row }: { row: { original: VehicleType } }) => {
    if (!countrySelected) {
      return <span className="text-muted-foreground text-xs">Select country</span>;
    }
    const pricing = pricingMap[row.original.id];
    if (!pricing) {
      return <span className="text-muted-foreground text-xs">Not set</span>;
    }
    return (
      <span className="text-muted-foreground">
        {formatMinor(pricing[field] as number, pricing.currencyCode)}
      </span>
    );
  };
}

export function getVehicleTypeColumns({
  pricingMap,
  countrySelected,
  onEdit,
  onDelete,
  onEditPricing,
}: Props): ColumnDef<VehicleType>[] {
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
    { id: "baseRate", header: "Base Rate", cell: rateCell("baseRateMinor", pricingMap, countrySelected) },
    { id: "perKmRate", header: "Per KM Rate", cell: rateCell("perKmRateMinor", pricingMap, countrySelected) },
    { id: "perMinRate", header: "Per Min Rate", cell: rateCell("perMinRateMinor", pricingMap, countrySelected) },
    { id: "minFare", header: "Min Fare", cell: rateCell("minFareMinor", pricingMap, countrySelected) },
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
            onClick={() => onEditPricing(row.original)}
            className="border-border hover:bg-muted cursor-pointer"
            title="Edit pricing"
            disabled={!countrySelected}
          >
            <Banknote className="h-3.5 w-3.5" />
          </Button>
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
            variant="destructive"
            size="sm"
            onClick={() => onDelete(row.original)}
            className="cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}