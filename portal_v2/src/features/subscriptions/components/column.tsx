import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Pencil, CreditCard, Ban, XCircle, Info, Tag, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan, LookupOption } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  onEdit: (plan: SubscriptionPlan) => void;
  onViewDetails: (plan: SubscriptionPlan) => void;
  onViewVersions?: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
  onManageGroupPricing?: (plan: SubscriptionPlan) => void;
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
  onViewVersions,
  onToggleActive,
  onManageGroupPricing,
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
          <div className="flex flex-col">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>{row.original.name}</span>
              {row.original.version && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewVersions?.(row.original);
                  }}
                  className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  title="Click to view all versions"
                >
                  v{row.original.version}
                  {row.original.versionCount && row.original.versionCount > 1 && (
                    <span className="ml-1 text-[9px] font-normal opacity-80">
                      ({row.original.versionCount} vers)
                    </span>
                  )}
                </button>
              )}
            </div>
            {row.original.entitlements?.commissionRate !== undefined && (
              <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                {Number(row.original.entitlements.commissionRate) * 100}% Comm. Rate
              </span>
            )}
          </div>
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
      size: 170,
      minSize: 170,
      maxSize: 170,

      header: () => (
        <div className="w-full text-center">
          Actions
        </div>
      ),

      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(row.original);
            }}
            className="h-8 w-8 cursor-pointer"
            title="View Details"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>

          {onViewVersions && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onViewVersions(row.original);
              }}
              className="h-8 w-8 text-primary hover:text-primary cursor-pointer"
              title="View Version History"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          )}

          {onManageGroupPricing && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onManageGroupPricing(row.original);
              }}
              className="h-8 w-8 text-primary hover:text-primary cursor-pointer"
              title="Manage Group Offers & Pricing"
            >
              <Tag className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 w-8 cursor-pointer"
            title="Edit / Version Plan"
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
            className="h-8 w-8 cursor-pointer"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }
  ];
}
