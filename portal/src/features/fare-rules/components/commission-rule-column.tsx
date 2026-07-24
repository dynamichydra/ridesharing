import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommissionRule, LookupOption } from "../types";

interface Props {
  onEdit: (rule: CommissionRule) => void;
  onToggleActive: (rule: CommissionRule) => void;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
}

function nameFromId(options: LookupOption[], id: string | null): string {
  if (!id) return "All";
  return options.find((o) => o.id === id)?.name || id;
}

function pct(rate: string): string {
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

export function getCommissionRuleColumns({ onEdit, onToggleActive, countries, vehicleTypes }: Props): ColumnDef<CommissionRule>[] {
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
      accessorKey: "vehicleTypeId",
      header: "Vehicle Type",
      cell: ({ row }) => <span className="text-foreground">{nameFromId(vehicleTypes, row.original.vehicleTypeId)}</span>,
    },
    {
      accessorKey: "bookingFeeMinor",
      header: "Booking Fee",
      cell: ({ row }) => <span className="text-foreground">{(row.original.bookingFeeMinor / 100).toFixed(2)}</span>,
    },
    {
      accessorKey: "subscriberRate",
      header: "Subscriber Rate",
      cell: ({ row }) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {pct(row.original.subscriberRate)}
        </span>
      ),
    },
    {
      accessorKey: "nonSubscriberRate",
      header: "Non-Subscriber Rate",
      cell: ({ row }) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {pct(row.original.nonSubscriberRate)}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.priority}</span>,
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
