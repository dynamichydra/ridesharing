import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { LegalDocument, LookupOption } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  countries: LookupOption[];
}

export function getLegalDocumentColumns({ countries }: Props): ColumnDef<LegalDocument>[] {
  return [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground capitalize">
          {row.original.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.version}</span>,
    },
    {
      accessorKey: "countryId",
      header: "Scope",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.countryId
            ? countries.find((c) => c.id === row.original.countryId)?.name || row.original.countryId
            : "Global"}
        </span>
      ),
    },
    {
      accessorKey: "effectiveFrom",
      header: "Effective From",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.effectiveFrom)}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <XCircle className="h-3.5 w-3.5" /> Inactive
          </span>
        ),
    },
    {
      id: "link",
      header: "",
      cell: ({ row }) => (
        <a
          href={row.original.contentUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline text-xs flex items-center gap-1"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
  ];
}
