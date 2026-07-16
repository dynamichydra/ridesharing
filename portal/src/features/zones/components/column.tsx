import type { ColumnDef } from "@tanstack/react-table";
import { Map, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Zone } from "../types";

interface Props {
  countriesMap: Map<string, string>;
  onEdit: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}

export function getZoneColumns({
  countriesMap,
  onEdit,
  onDelete,
}: Props): ColumnDef<Zone>[] {
  return [
    {
      accessorKey: "name",
      header: "Zone Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Map className="h-4 w-4" />
          </div>
          <div className="font-medium text-foreground">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => countriesMap.get(row.original.countryId) || row.original.countryId,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: "multiplier",
      header: "Multiplier",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-foreground">{row.original.multiplier}x</span>
      ),
    },
    {
      id: "actions",
      size: 100,
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 w-8"
            title="Edit zone"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.original);
            }}
            className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white"
            title="Delete zone"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
