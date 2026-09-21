import type { ColumnDef } from "@tanstack/react-table";
import { Map, Pencil, Ban, CheckCircle2, XCircle, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Zone } from "../types";

interface Props {
  countriesMap: Map<string, string>;
  citiesMap?: Map<string, string>;
  onViewHex: (zone: Zone) => void;
  onEdit: (zone: Zone) => void;
  onToggleActive: (zone: Zone) => void;
  onGenerateHex: (zone: Zone) => void;
}

export function getZoneColumns({
  countriesMap,
  citiesMap,
  onViewHex,
  onEdit,
  onToggleActive,
  onGenerateHex,
}: Props): ColumnDef<Zone>[] {
  return [
    {
      accessorKey: "name",
      header: "Special Zone Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Map className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.original.name}</div>
            {row.original.description && (
              <div className="text-[11px] text-muted-foreground truncate max-w-xs">{row.original.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => countriesMap.get(row.original.countryId) || row.original.countryId,
    },
    {
      accessorKey: "cityId",
      header: "City",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.cityName || (citiesMap ? citiesMap.get(row.original.cityId) : null) || row.original.cityId || "—"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Category",
      cell: ({ row }) => {
        const type = row.original.type;
        if (type === "airport") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">✈️ Airport</span>;
        }
        if (type === "college") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">🎓 College</span>;
        }
        if (type === "station") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">🚆 Station</span>;
        }
        if (type === "tech_park") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">🏢 Tech Park</span>;
        }
        if (type === "surge") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">⚡ Surge</span>;
        }
        if (type === "restricted") {
          return <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">🚫 Restricted</span>;
        }
        return (
          <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "multiplier",
      header: "Pricing / Multiplier",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-foreground">{row.original.multiplier}x</span>
          {(row.original.airportFeeMinor || row.original.pickupFeeMinor || row.original.dropoffFeeMinor) ? (
            <span className="text-[11px] text-muted-foreground font-mono">
              {[
                row.original.airportFeeMinor ? `Airport ₹${(row.original.airportFeeMinor / 100).toFixed(0)}` : null,
                row.original.pickupFeeMinor ? `Pickup ₹${(row.original.pickupFeeMinor / 100).toFixed(0)}` : null,
                row.original.dropoffFeeMinor ? `Dropoff ₹${(row.original.dropoffFeeMinor / 100).toFixed(0)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "hexCells",
      header: "H3 Index",
      cell: ({ row }) =>
        row.original.resolution != null ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewHex(row.original);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/20 transition-colors"
            title="Click to view H3 Hexagons on Google Maps"
          >
            <Hexagon className="h-3.5 w-3.5 text-primary" />
            <span>
              res {row.original.resolution} · {row.original.hexCells?.length ?? 0} cells
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewHex(row.original);
            }}
            className="text-xs text-muted-foreground italic hover:text-foreground cursor-pointer underline"
            title="View Boundary on Google Maps"
          >
            View boundary map
          </button>
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
      header: () => <div className="text-right pr-2">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewHex(row.original);
            }}
            className="h-8 gap-1 text-xs text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
            title="View H3 Hexagon Google Map"
          >
            <Hexagon className="h-3.5 w-3.5" />
            <span>View Map</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Edit zone"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateHex(row.original);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title={row.original.resolution != null ? "Regenerate hex cells" : "Generate hex cells"}
          >
            <Hexagon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(row.original);
            }}
            className={`h-8 w-8 cursor-pointer ${
              row.original.isActive
                ? "text-destructive hover:bg-destructive/10"
                : "text-emerald-600 hover:bg-emerald-500/10"
            }`}
            title={row.original.isActive ? "Disable zone" : "Enable zone"}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
