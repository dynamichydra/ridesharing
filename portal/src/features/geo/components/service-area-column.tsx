import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit, Trash2, MapPin } from "lucide-react";
import type { CityServiceArea } from "../types";

export function getServiceAreaColumns({
  onEdit,
  onToggleActive,
  onDelete,
}: {
  onEdit: (area: CityServiceArea) => void;
  onToggleActive: (area: CityServiceArea) => void;
  onDelete: (area: CityServiceArea) => void;
}): ColumnDef<CityServiceArea>[] {
  return [
    {
      accessorKey: "name",
      header: "Service Area Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {row.original.city?.name || "City boundary"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Operational Status",
      cell: ({ row }) => {
        const status = row.original.status || "ACTIVE";
        const colors: Record<string, string> = {
          ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          INACTIVE: "bg-muted text-muted-foreground border-border",
          RESTRICTED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
        return (
          <Badge variant="outline" className={`font-mono font-medium ${colors[status] || ""}`}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "resolution",
      header: "H3 Index Resolution",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          Res {row.original.resolution ?? 9} ({row.original.hexCells?.length ?? 0} cells)
        </span>
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
            title="Edit Area"
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
            title={row.original.isActive ? "Disable Area" : "Enable Area"}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
            onClick={() => onDelete(row.original)}
            title="Delete Area"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
