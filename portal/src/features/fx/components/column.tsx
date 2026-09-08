import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight } from "lucide-react";
import type { FxRate } from "../types";
import { formatDate } from "@/lib/utils";

export function getFxRateColumns({
  onDelete,
}: {
  onDelete: (rate: FxRate) => void;
}): ColumnDef<FxRate, any>[] {
  return [
    {
      id: "pair",
      header: "Currency Pair",
      cell: ({ row }) => {
        const { baseCurrency, quoteCurrency } = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
              {baseCurrency}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono font-bold text-sm bg-secondary px-2.5 py-1 rounded-md border border-border">
              {quoteCurrency}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "rate",
      header: "Exchange Rate",
      cell: ({ row }) => {
        const { rate, baseCurrency, quoteCurrency } = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-mono font-semibold text-foreground text-sm">
              1 {baseCurrency} = {rate.toFixed(4)} {quoteCurrency}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              1 {quoteCurrency} = {(1 / rate).toFixed(6)} {baseCurrency}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "provider",
      header: "Source / Provider",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize font-medium">
          {row.original.provider || "System"}
        </Badge>
      ),
    },
    {
      accessorKey: "effectiveDate",
      header: "Effective Date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.effectiveDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(row.original)}
            title="Delete Rate"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
