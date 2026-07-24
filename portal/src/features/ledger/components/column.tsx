import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LedgerTransaction } from "../types";

interface Actions {
  onViewEntries: (transaction: LedgerTransaction) => void;
}

export function getLedgerTransactionColumns({ onViewEntries }: Actions): ColumnDef<LedgerTransaction>[] {
  return [
    {
      accessorKey: "businessType",
      header: "Business Type",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground capitalize">
          {row.original.businessType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: ({ row }) =>
        row.original.referenceType ? (
          <div>
            <div className="text-xs text-foreground capitalize">{row.original.referenceType.replace(/_/g, " ")}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.original.referenceId?.slice(0, 8)}...</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "idempotencyKey",
      header: "Idempotency Key",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono max-w-xs truncate block">
          {row.original.idempotencyKey || "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Posted At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="h-7 gap-1.5 cursor-pointer" onClick={() => onViewEntries(row.original)}>
          <Eye className="h-3 w-3" /> Entries
        </Button>
      ),
    },
  ];
}
