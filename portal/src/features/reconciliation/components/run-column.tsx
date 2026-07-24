import type { ColumnDef } from "@tanstack/react-table";
import type { ReconciliationRun } from "../types";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface Actions {
  onViewMismatches: (run: ReconciliationRun) => void;
}

export function getRunColumns({ onViewMismatches }: Actions): ColumnDef<ReconciliationRun>[] {
  return [
    {
      accessorKey: "gateway",
      header: "Gateway",
      cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.gateway}</span>,
    },
    {
      id: "window",
      header: "Window",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.windowFrom).toLocaleString()} → {new Date(row.original.windowTo).toLocaleString()}
        </span>
      ),
    },
    {
      id: "counts",
      header: "Internal / External",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.totalInternal} / {row.original.totalExternal}
        </span>
      ),
    },
    {
      accessorKey: "mismatchCount",
      header: "Mismatches",
      cell: ({ row }) => (
        <span className={`font-semibold ${row.original.mismatchCount > 0 ? "text-red-600" : "text-foreground"}`}>
          {row.original.mismatchCount}
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
      accessorKey: "createdAt",
      header: "Run At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.mismatchCount > 0 ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline cursor-pointer"
            onClick={() => onViewMismatches(row.original)}
          >
            View mismatches
          </button>
        ) : null,
    },
  ];
}
