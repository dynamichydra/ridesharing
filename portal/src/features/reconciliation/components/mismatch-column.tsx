import type { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Mismatch } from "../types";

function formatMinor(amountMinor: number | null): string {
  if (amountMinor == null) return "—";
  return (amountMinor / 100).toFixed(2);
}

const TYPE_LABELS: Record<string, string> = {
  missing_internal: "Missing internally",
  missing_external: "Missing at gateway",
  amount_mismatch: "Amount mismatch",
  duplicate_internal: "Duplicate internal",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ignored: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
};

interface Actions {
  onResolve: (mismatch: Mismatch) => void;
  onIgnore: (mismatch: Mismatch) => void;
}

export function getMismatchColumns({ onResolve, onIgnore }: Actions): ColumnDef<Mismatch>[] {
  return [
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">{TYPE_LABELS[row.original.type] || row.original.type}</span>
      ),
    },
    {
      accessorKey: "gatewayPaymentId",
      header: "Gateway Payment ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.gatewayPaymentId || "—"}</span>
      ),
    },
    {
      id: "amounts",
      header: "Internal / External",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatMinor(row.original.internalAmountMinor)} / {formatMinor(row.original.externalAmountMinor)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">{row.original.notes || "—"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Found At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "open" ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              onClick={() => onResolve(row.original)}
            >
              <Check className="h-3 w-3" /> Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 cursor-pointer"
              onClick={() => onIgnore(row.original)}
            >
              <X className="h-3 w-3" /> Ignore
            </Button>
          </div>
        ) : null,
    },
  ];
}
