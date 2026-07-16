import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, FileText, ListChecks, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentType } from "../types";

interface Props {
  onEdit: (dt: DocumentType) => void;
  onManageRequirements: (dt: DocumentType) => void;
  onToggleActive: (dt: DocumentType) => void;
}

function flagList(dt: DocumentType): string[] {
  const flags: string[] = [];
  if (dt.requiresFront) flags.push("Front");
  if (dt.requiresBack) flags.push("Back");
  if (dt.requiresPdf) flags.push("PDF");
  if (dt.requiresExpiry) flags.push("Expiry");
  if (dt.requiresDocNumber) flags.push("Doc #");
  return flags;
}

export function getDocumentTypeColumns({
  onEdit,
  onManageRequirements,
  onToggleActive,
}: Props): ColumnDef<DocumentType>[] {
  return [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">{row.original.code}</span>
        </div>
      ),
    },
    {
      id: "requires",
      header: "Requires",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {flagList(row.original).map((f) => (
            <span
              key={f}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border"
            >
              {f}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "maxFileSizeMb",
      header: "Max Size",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.maxFileSizeMb} MB</span>
      ),
    },
    {
      accessorKey: "sortOrder",
      header: "Sort Order",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.sortOrder}</span>,
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
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageRequirements(row.original)}
            title="Manage requirements"
            className="cursor-pointer"
          >
            <ListChecks className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(row.original)}
            title="Edit"
            className="cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={() => onToggleActive(row.original)}
            title={row.original.isActive ? "Disable" : "Enable"}
            className="cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
