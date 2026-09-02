import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Pencil, CreditCard, Ban, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan, LookupOption } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  onEdit: (plan: SubscriptionPlan) => void;
  onViewDetails: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
  countries: LookupOption[];
}

function countryName(countries: LookupOption[], id: string): string {
  return countries.find((c) => c.id === id)?.name || id;
}

function formatPrice(priceMinor: number, currencyCode: string): string {
  return `${currencyCode} ${(priceMinor / 100).toFixed(2)}`;
}

export function getSubscriptionPlanColumns({
  onEdit,
  onViewDetails,
  onToggleActive,
  countries,
}: Props): ColumnDef<SubscriptionPlan>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="font-semibold text-foreground">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => (
        <span className="text-foreground">{countryName(countries, row.original.countryId)}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <span className="capitalize text-muted-foreground">{row.original.type}</span>,
    },
    {
      accessorKey: "priceMinor",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatPrice(row.original.priceMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "durationDays",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.durationDays ? `${row.original.durationDays} Days` : "Lifetime"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Active",
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
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      size: 150,
      minSize: 150,
      maxSize: 150,

      header: () => (
        <div className="w-full text-center">
          Actions
        </div>
      ),

      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(row.original);
            }}
            className="h-8 w-8"
            title="View Details"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 w-8"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(row.original);
            }}
            className="h-8 w-8"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }
  ];
}
