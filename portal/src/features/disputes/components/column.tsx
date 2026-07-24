import type { ColumnDef } from "@tanstack/react-table";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dispute } from "../types";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

// Gateways don't share one status enum — classify loosely for badge color only, same
// approximation as the backend's classifyDisputeStatus (dispute.service.js).
function classify(status: string): "won" | "lost" | "open" {
  const s = status.toLowerCase();
  if (s.includes("won")) return "won";
  if (s.includes("lost")) return "lost";
  return "open";
}

const STATUS_STYLES: Record<string, string> = {
  won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

interface Actions {
  onEditNotes: (dispute: Dispute) => void;
}

export function getDisputeColumns({ onEditNotes }: Actions): ColumnDef<Dispute>[] {
  return [
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {formatMinor(row.original.amountMinor, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "gateway",
      header: "Gateway",
      cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.gateway}</span>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground capitalize">{row.original.reason?.replace(/_/g, " ") || "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[classify(row.original.status)]}`}>
          {row.original.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "evidenceDueBy",
      header: "Evidence Due",
      cell: ({ row }) =>
        row.original.evidenceDueBy ? (
          <span className="text-xs text-muted-foreground">{new Date(row.original.evidenceDueBy).toLocaleDateString()}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "adminNotes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">{row.original.adminNotes || "—"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Opened At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="h-7 gap-1.5 cursor-pointer" onClick={() => onEditNotes(row.original)}>
          <NotebookPen className="h-3 w-3" /> Notes
        </Button>
      ),
    },
  ];
}
