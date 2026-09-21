import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit, Coins } from "lucide-react";
import type { Currency } from "../types";

export function getCurrencyColumns({
  onEdit,
  onToggleActive,
}: {
  onEdit: (currency: Currency) => void;
  onToggleActive: (currency: Currency) => void;
}): ColumnDef<Currency>[] {
  return [
    {
      accessorKey: "code",
      header: "Currency",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold font-mono text-sm shrink-0">
            {row.original.symbol || <Coins className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground font-mono">{row.original.code}</span>
            <span className="text-xs text-muted-foreground">{row.original.name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
          {row.original.symbol}
        </Badge>
      ),
    },
    {
      accessorKey: "minorUnitExponent",
      header: "Minor Exponent",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span className="font-mono font-medium">{row.original.minorUnitExponent} decimal places</span>
          <span className="text-muted-foreground text-[11px]">
            1 major = {Math.pow(10, row.original.minorUnitExponent)} minor units
          </span>
        </div>
      ),
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
          {row.original.isActive ? "Active" : "Inactive"}
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(row.original)}
            title="Edit Currency"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 cursor-pointer ${
              row.original.isActive
                ? "text-destructive hover:bg-destructive/10"
                : "text-emerald-600 hover:bg-emerald-500/10"
            }`}
            onClick={() => onToggleActive(row.original)}
            title={row.original.isActive ? "Disable Currency" : "Enable Currency"}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
