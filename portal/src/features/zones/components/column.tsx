import type { ColumnDef } from "@tanstack/react-table";
import { Map, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Zone } from "../types";

interface Props {
  onEdit: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getZoneColumns({ onEdit, onDelete }: Props): ColumnDef<Zone>[] {
  return [
    {
      accessorKey: "name",
      header: "Zone Details",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Map className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.original.name}</div>
            {row.original.description && (
              <div className="text-xs text-muted-foreground">{row.original.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{capitalize(row.original.type)}</span>
      ),
    },
    {
      accessorKey: "multiplier",
      header: "Surge Multiplier",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.multiplier}x</span>
      ),
    },
    {
      id: "coordinatesCount",
      header: "Coordinates Count",
      cell: ({ row }) => {
        const count = row.original.polygon?.coordinates?.[0]?.length ?? 0;
        return <span className="text-muted-foreground">{count} nodes</span>;
      },
    },
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
  size: 110,
  minSize: 110,
  maxSize: 110,

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
          onEdit(row.original);
        }}
        className="h-8 w-8"
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
        className="h-8 w-8"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  ),
}
  ];
}