import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Pencil, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Country } from "../types";

interface Props {
  onEdit: (country: Country) => void;
  onToggleActive: (country: Country) => void;
}

export function getCountryColumns({ onEdit, onToggleActive }: Props): ColumnDef<Country>[] {
  return [
    {
      accessorKey: "name",
      header: "Country",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.original.name}</span>
          {row.original.isDefault && (
            <span title="Default fallback country">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "isoCode",
      header: "ISO",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">{row.original.isoCode}</span>
      ),
    },
    {
      accessorKey: "dialCode",
      header: "Dial Code",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.dialCode}</span>,
    },
    {
      accessorKey: "currencyCode",
      header: "Currency",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.currencyCode}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-xs">
            <CheckCircle2 className="h-4 w-4" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <XCircle className="h-4 w-4" /> Disabled
          </span>
        ),
    },
    {
      id: "actions",
      size: 180,
      minSize: 180,
      maxSize: 180,
      header: () => <div className="w-full flex justify-center">Actions</div>,
      cell: ({ row }) => (
        <div className="w-full flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="h-8 border-border text-xs font-medium hover:bg-muted cursor-pointer"
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            variant={row.original.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(row.original);
            }}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <Ban className="mr-1 h-3.5 w-3.5" />
            {row.original.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];
}
