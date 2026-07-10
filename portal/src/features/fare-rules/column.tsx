import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FareRule } from "./types";

export interface FareRuleColumn {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (rule: FareRule) => React.ReactNode;
}

interface FareRuleColumnHandlers {
  onEdit: (rule: FareRule) => void;
  onDelete: (rule: FareRule) => void;
}

const RULE_TYPE_LABEL: Record<string, string> = {
  time: "Time-based",
  zone: "Zone-based",
  traffic: "Traffic-based",
  custom: "Custom",
};

// Column definitions consumed by list.tsx to render the fare rules table.
export function getFareRuleColumns({
  onEdit,
  onDelete,
}: FareRuleColumnHandlers): FareRuleColumn[] {
  return [
    {
      key: "name",
      header: "Rule Name",
      render: (rule) => (
        <>
          <div className="font-semibold text-foreground">{rule.name}</div>
          {rule.description && (
            <div className="text-xs text-muted-foreground max-w-xs truncate" title={rule.description}>
              {rule.description}
            </div>
          )}
        </>
      ),
    },
    {
      key: "ruleType",
      header: "Type",
      render: (rule) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {RULE_TYPE_LABEL[rule.ruleType] || rule.ruleType}
        </span>
      ),
    },
    {
      key: "window",
      header: "Time Window",
      render: (rule) =>
        rule.startTime && rule.endTime ? (
          <span className="text-foreground font-medium">
            {rule.startTime} – {rule.endTime}
          </span>
        ) : (
          <span className="text-muted-foreground italic text-xs">—</span>
        ),
    },
    {
      key: "multiplier",
      header: "Multiplier",
      render: (rule) => (
        <span className="font-semibold text-foreground">{rule.multiplier}x</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (rule) =>
        rule.isActive ? (
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
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right space-x-2",
      render: (rule) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(rule)}
            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(rule)}
            className="text-xs font-medium cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </>
      ),
    },
  ];
}