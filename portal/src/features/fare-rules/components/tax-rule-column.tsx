import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaxRule, LookupOption } from "../types";

interface Props {
  onEdit: (rule: TaxRule) => void;
  onToggleActive: (rule: TaxRule) => void;
  countries: LookupOption[];
}

const APPLIES_TO_LABEL: Record<string, string> = {
  fare: "Ride Fares",
  subscription: "Subscriptions",
  both: "Both",
};

function nameFromId(options: LookupOption[], id: string): string {
  return options.find((o) => o.id === id)?.name || id;
}

export function getTaxRuleColumns({ onEdit, onToggleActive, countries }: Props): ColumnDef<TaxRule>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-semibold text-foreground">{row.original.name}</div>,
    },
    {
      accessorKey: "countryId",
      header: "Country",
      cell: ({ row }) => <span className="text-foreground">{nameFromId(countries, row.original.countryId)}</span>,
    },
    {
      accessorKey: "appliesTo",
      header: "Applies To",
      cell: ({ row }) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {APPLIES_TO_LABEL[row.original.appliesTo] || row.original.appliesTo}
        </span>
      ),
    },
    {
      accessorKey: "rate",
      header: "Rate",
      cell: ({ row }) => <span className="font-semibold text-foreground">{(Number(row.original.rate) * 100).toFixed(2)}%</span>,
    },
    {
      accessorKey: "isInclusive",
      header: "Inclusive",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.isInclusive ? "Yes" : "No"}</span>
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
      id: "actions",
      header: () => <div className="w-full text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(row.original)} className="border-border hover:bg-muted cursor-pointer">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleActive(row.original)}
            className="cursor-pointer"
            title={row.original.isActive ? "Disable" : "Enable"}
          >
            {row.original.isActive ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];
}
