import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Pencil, XCircle, Hexagon, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { City } from "../types";

interface Props {
  countriesMap: Map<string, string>;
  statesMap: Map<string, string>;
  cityTypesMap?: Map<string, string>;
  onEdit: (city: City) => void;
  onToggleActive: (city: City) => void;
  onViewHex?: (city: City) => void;
}

export function getCityColumns({
  countriesMap,
  statesMap,
  cityTypesMap,
  onEdit,
  onToggleActive,
  onViewHex,
}: Props): ColumnDef<City>[] {
  return [
    {
      accessorKey: "name",
      header: "City",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          {row.original.code && (
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold">
              {row.original.code}
            </span>
          )}
          {row.original.cityTypeId && cityTypesMap?.get(row.original.cityTypeId) && (
            <Badge variant="outline" className="text-[10px] py-0 font-medium">
              {cityTypesMap.get(row.original.cityTypeId)}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "stateId",
      header: "State",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {statesMap.get(row.original.stateId) || row.original.stateId}
        </span>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {countriesMap.get(row.original.countryId) || row.original.countryId}
        </span>
      ),
    },
    {
      accessorKey: "currencyCode",
      header: "Currency",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground font-semibold">
          {row.original.currencyCode || "INR"}
        </span>
      ),
    },
    {
      accessorKey: "polygon",
      header: "Service Boundary & H3",
      cell: ({ row }) => {
        const hasBoundary = !!(row.original.polygon?.coordinates || row.original.boundary);
        const hexCount = Array.isArray(row.original.hexCells) ? row.original.hexCells.length : 0;
        
        return hasBoundary ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewHex?.(row.original);
            }}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-medium border border-sky-500/20 transition-colors cursor-pointer"
            title="Click to view H3 Hex Grid & Boundary Overlay on Google Maps"
          >
            <Hexagon className="h-3.5 w-3.5" />
            <span>{hexCount > 0 ? `${hexCount} cells` : "Configured"} (Res {row.original.resolution ?? 8})</span>
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Not configured
          </span>
        );
      },
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
      size: 220,
      minSize: 220,
      maxSize: 220,
      header: () => <div className="w-full flex justify-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          {onViewHex && (row.original.polygon?.coordinates || row.original.boundary) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewHex(row.original);
              }}
              className="h-8 border-border text-xs font-medium hover:bg-muted cursor-pointer"
              title="View Coverage Map"
            >
              <Map className="mr-1 h-3.5 w-3.5 text-sky-500" />
              Map
            </Button>
          )}

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

