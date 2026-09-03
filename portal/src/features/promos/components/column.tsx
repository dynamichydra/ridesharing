import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit, Trash2 } from "lucide-react";
import type { Promo } from "../types";
import { formatDate, moment } from "@/lib/utils";

export function getPromoColumns({
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  onEdit: (promo: Promo) => void;
  onToggleStatus: (promo: Promo) => void;
  onDelete?: (promo: Promo) => void;
}): ColumnDef<Promo>[] {
  return [
    {
      accessorKey: "code",
      header: "Promo Code",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-bold text-foreground tracking-wider bg-accent/60 px-2 py-0.5 rounded border border-border w-fit text-xs">
            {row.original.code}
          </span>
          {row.original.description && (
            <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "discountType",
      header: "Discount",
      cell: ({ row }) => {
        const rawType = String(row.original.discountType || "").toLowerCase();
        const isPercentage = rawType === "percentage" || rawType === "percent";
        const val = row.original.discountValue ?? row.original.discountValueMinor ?? 0;

        if (isPercentage) {
          return (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              {val}% OFF
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
            ₹{(val / 100).toFixed(2)} FLAT
          </Badge>
        );
      },
    },
    {
      accessorKey: "minFareMinor",
      header: "Min Fare / Max Cap",
      cell: ({ row }) => {
        const minFare = row.original.minFareMinor;
        const maxCap = row.original.maxDiscountMinor;
        return (
          <div className="flex flex-col text-xs text-muted-foreground">
            <span>Min: {minFare != null ? `₹${(minFare / 100).toFixed(0)}` : "None"}</span>
            <span>Cap: {maxCap != null ? `₹${(maxCap / 100).toFixed(0)}` : "None"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "usedCount",
      header: "Redemptions",
      cell: ({ row }) => {
        const limit = row.original.maxUses ?? row.original.usageLimit;
        return (
          <div className="text-xs font-medium">
            <span className="font-bold text-foreground">{row.original.usedCount}</span>
            {limit ? ` / ${limit}` : " (Unlimited)"}
          </div>
        );
      },
    },
    {
      accessorKey: "expiresAt",
      header: "Expiry",
      cell: ({ row }) => {
        const exp = row.original.expiresAt || row.original.validUntil;
        if (!exp) return <span className="text-xs text-muted-foreground">Never</span>;
        const isExpired = moment(exp).isBefore(moment());
        return (
          <span className={`text-xs ${isExpired ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {formatDate(exp)}
            {isExpired && " (Expired)"}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.isActive
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none"
              : "bg-muted text-muted-foreground border-none"
          }
        >
          {row.original.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(row.original)}
            title="Edit Promo"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 cursor-pointer ${
              row.original.isActive
                ? "text-amber-600 hover:bg-amber-500/10"
                : "text-emerald-600 hover:bg-emerald-500/10"
            }`}
            onClick={() => onToggleStatus(row.original)}
            title={row.original.isActive ? "Deactivate" : "Activate"}
          >
            <Power className="h-3.5 w-3.5" />
          </Button>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => onDelete(row.original)}
              title="Delete Promo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
