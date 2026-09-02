import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Edit2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FareRule, LookupOption } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  onView: (rule: FareRule) => void;
  onEdit: (rule: FareRule) => void;
  onToggleActive: (rule: FareRule) => void;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  zones: LookupOption[];
}

const RULE_TYPE_LABEL: Record<string, string> = {
  time: "Time-based",
  traffic: "Traffic-based",
  zone: "Zone-based",
};

function nameFromId(options: LookupOption[], id: string | null): string {
  if (!id) return "—";
  return options.find((o) => o.id === id)?.name || id;
}

export function getFareRuleColumns({
  onView,
  onEdit,
  onToggleActive,
  countries,
  vehicleTypes,
  zones,
}: Props): ColumnDef<FareRule>[] {
  return [
    {
      accessorKey: "name",
      header: "Rule Name",
      cell: ({ row }) => <div className="font-semibold text-foreground">{row.original.name}</div>,
    },
    {
      accessorKey: "ruleType",
      header: "Rule Type",
      cell: ({ row }) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {RULE_TYPE_LABEL[row.original.ruleType] || row.original.ruleType}
        </span>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => (
        <span className="text-foreground">{nameFromId(countries, row.original.countryId)}</span>
      ),
    },
    {
      accessorKey: "vehicleTypeId",
      header: "Vehicle Type",
      cell: ({ row }) => (
        <span className="text-foreground">{nameFromId(vehicleTypes, row.original.vehicleTypeId)}</span>
      ),
    },
    {
      accessorKey: "zoneId",
      header: "Zone",
      cell: ({ row }) =>
        row.original.zoneId ? (
          <span className="text-foreground">{nameFromId(zones, row.original.zoneId)}</span>
        ) : (
          <span className="text-muted-foreground italic text-xs">—</span>
        ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.priority}</span>,
    },
    {
      accessorKey: "multiplier",
      header: "Multiplier",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.multiplier}x</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
            Inactive
          </span>
        ),
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      size: 140,
      minSize: 140,
      maxSize: 140,
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(row.original)}
            className="border-border hover:bg-muted cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(row.original)}
            className="border-border hover:bg-muted cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleActive(row.original)}
            className="cursor-pointer"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
