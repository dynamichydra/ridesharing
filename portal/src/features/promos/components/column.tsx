import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit } from "lucide-react";
import type { Promo } from "../types";

export function getPromoColumns({
  onEdit,
  onToggleStatus,
}: {
  onEdit: (promo: Promo) => void;
  onToggleStatus: (promo: Promo) => void;
}): ColumnDef<Promo>[] {
  return [
    {
      accessorKey: "code",
      header: "Promo Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-foreground tracking-wider bg-accent/60 px-2 py-0.5 rounded border border-border">
            {row.original.code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "discountType",
      header: "Discount",
      cell: ({ row }) => {
        const { discountType, discountValueMinor } = row.original;
        if (discountType === "PERCENTAGE") {
          return (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              {discountValueMinor}% OFF
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
            ₹{(discountValueMinor / 100).toFixed(2)} FLAT
          </Badge>
        );
      },
    },
    {
      accessorKey: "minFareMinor",
      header: "Min Fare / Max Cap",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>Min: {row.original.minFareMinor != null ? `₹${(row.original.minFareMinor / 100).toFixed(0)}` : "None"}</span>
          <span>Cap: {row.original.maxDiscountMinor != null ? `₹${(row.original.maxDiscountMinor / 100).toFixed(0)}` : "None"}</span>
        </div>
      ),
    },
    {
      accessorKey: "usedCount",
      header: "Redemptions",
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {row.original.usedCount}
          {row.original.maxUses ? ` / ${row.original.maxUses}` : " (Unlimited)"}
        </div>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expiry",
      cell: ({ row }) => {
        if (!row.original.expiresAt) return <span className="text-xs text-muted-foreground">Never</span>;
        const isExpired = new Date(row.original.expiresAt).getTime() < Date.now();
        return (
          <span className={`text-xs ${isExpired ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {new Date(row.original.expiresAt).toLocaleDateString()}
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
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(row.original)}
            title="Edit Promo"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              row.original.isActive
                ? "text-destructive hover:bg-destructive/10"
                : "text-emerald-600 hover:bg-emerald-500/10"
            }`}
            onClick={() => onToggleStatus(row.original)}
            title={row.original.isActive ? "Deactivate" : "Activate"}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
