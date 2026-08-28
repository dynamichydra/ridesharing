import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit, Globe, Car } from "lucide-react";
import type { CommissionRule } from "../types";

function formatRate(val: string | number | undefined): string {
  if (val == null) return "0%";
  const num = Number(val);
  if (isNaN(num)) return "0%";
  if (num < 1) return `${(num * 100).toFixed(1).replace(/\.0$/, "")}%`;
  return `${num}%`;
}

export function getCommissionRuleColumns({
  onEdit,
  onToggleStatus,
}: {
  onEdit: (rule: CommissionRule) => void;
  onToggleStatus: (rule: CommissionRule) => void;
}): ColumnDef<CommissionRule>[] {
  return [
    {
      accessorKey: "name",
      header: "Rule Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {row.original.country?.name || "Global (All Countries)"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              {row.original.vehicleType?.name || "All Vehicle Types"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "subscriberRate",
      header: "Subscriber Rate",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono font-medium">
          {formatRate(row.original.subscriberRate)}
        </Badge>
      ),
    },
    {
      accessorKey: "nonSubscriberRate",
      header: "Non-Subscriber Rate",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono font-medium">
          {formatRate(row.original.nonSubscriberRate)}
        </Badge>
      ),
    },
    {
      accessorKey: "bookingFeeMinor",
      header: "Booking Fee",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.bookingFeeMinor != null && row.original.bookingFeeMinor > 0
            ? `₹${(row.original.bookingFeeMinor / 100).toFixed(2)}`
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs">
          P{row.original.priority ?? 1}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onEdit(row.original)}
            title="Edit Rule"
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
            onClick={() => onToggleStatus(row.original)}
            title={row.original.isActive ? "Disable Rule" : "Enable Rule"}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

