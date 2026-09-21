import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit, DollarSign } from "lucide-react";
import type { CityType } from "../types";

export function getCityTypeColumns({
  onEdit,
  onToggleActive,
  onManageFares,
}: {
  onEdit: (type: CityType) => void;
  onToggleActive: (type: CityType) => void;
  onManageFares?: (type: CityType) => void;
}): ColumnDef<CityType>[] {
  return [
    {
      accessorKey: "name",
      header: "Type / Tier Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
        </div>
      ),
    },
    {
      accessorKey: "densityLevel",
      header: "Density Level",
      cell: ({ row }) => {
        const level = row.original.densityLevel || "medium";
        const colors: Record<string, string> = {
          high: "bg-red-500/10 text-red-600 border-red-500/20",
          medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          rural: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
        return (
          <Badge variant="outline" className={`font-medium capitalize ${colors[level] || ""}`}>
            {level}
          </Badge>
        );
      },
    },
    {
      accessorKey: "defaultSurgeCap",
      header: "Max Surge Cap",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-amber-600">
          {Number(row.original.defaultSurgeCap).toFixed(2)}x
        </span>
      ),
    },
    {
      accessorKey: "waitingFeeEnabled",
      header: "Waiting Fee",
      cell: ({ row }) => (
        <Badge variant={row.original.waitingFeeEnabled ? "outline" : "secondary"}>
          {row.original.waitingFeeEnabled ? "Enabled" : "Disabled"}
        </Badge>
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
          {onManageFares && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 cursor-pointer font-medium border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onManageFares(row.original)}
              title="Manage vehicle fare rate versions and commissions on full page"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Fare Rates &amp; History
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(row.original)}
            title="Edit City Type"
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
            title={row.original.isActive ? "Disable Type" : "Enable Type"}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
