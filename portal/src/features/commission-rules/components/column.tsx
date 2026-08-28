import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Edit } from "lucide-react";
import type { CommissionRule } from "../types";

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
          {row.original.description && (
            <span className="text-xs text-muted-foreground">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "subscriberRate",
      header: "Subscriber Rate",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono font-medium">
          {row.original.subscriberRate}%
        </Badge>
      ),
    },
    {
      accessorKey: "nonSubscriberRate",
      header: "Non-Subscriber Rate",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono font-medium">
          {row.original.nonSubscriberRate}%
        </Badge>
      ),
    },
    {
      accessorKey: "flatCommissionMinor",
      header: "Flat Fee",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.flatCommissionMinor != null
            ? `₹${(row.original.flatCommissionMinor / 100).toFixed(2)}`
            : "—"}
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
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : "—"}
        </span>
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(row.original)}
            title="Edit Rule"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
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
