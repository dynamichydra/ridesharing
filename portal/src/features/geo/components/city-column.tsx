import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { City } from "../types";

interface Props {
  countriesMap: Map<string, string>;
  statesMap: Map<string, string>;
  onEdit: (city: City) => void;
  onToggleActive: (city: City) => void;
}

export function getCityColumns({
  countriesMap,
  statesMap,
  onEdit,
  onToggleActive,
}: Props): ColumnDef<City>[] {
  return [
    {
      accessorKey: "name",
      header: "City",
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "stateId",
      header: "State",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {statesMap.get(row.original.stateId) || row.original.stateId}
        </span>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {countriesMap.get(row.original.countryId) || row.original.countryId}
        </span>
      ),
    },
    {
      accessorKey: "timezone",
      header: "Timezone",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.timezone || "—"}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-xs">
            <CheckCircle2 className="h-4 w-4" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <XCircle className="h-4 w-4" /> Disabled
          </span>
        ),
    },
    {
      id: "actions",
      size: 180,
      minSize: 180,
      maxSize: 180,
      header: () => <div className="w-full flex justify-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 border-border text-xs font-medium hover:bg-muted cursor-pointer"
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(row.original);
            }}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <Ban className="mr-1 h-3.5 w-3.5" />
            {row.original.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];
}
