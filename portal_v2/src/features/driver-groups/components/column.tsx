import type { ColumnDef } from "@tanstack/react-table";
import { Users, Pencil, Trash2, UserCheck, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DriverGroup } from "../types";
import type { LookupOption } from "@/features/subscriptions/types";
import { formatDate } from "@/lib/utils";

interface Props {
  onEdit: (group: DriverGroup) => void;
  onManageMembers: (group: DriverGroup) => void;
  onDelete: (group: DriverGroup) => void;
  countries: LookupOption[];
}

function getCountryName(countries: LookupOption[], id?: string | null): string {
  if (!id) return "Global / All";
  return countries.find((c) => c.id === id)?.name || id;
}

export function getDriverGroupColumns({
  onEdit,
  onManageMembers,
  onDelete,
  countries,
}: Props): ColumnDef<DriverGroup>[] {
  return [
    {
      accessorKey: "name",
      header: "Group Name & Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.original.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                {row.original.code}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "countryId",
      header: "Country Scope",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {getCountryName(countries, row.original.countryId)}
        </span>
      ),
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ row }) => (
        <Badge variant="secondary" className="gap-1 font-semibold">
          <UserCheck className="h-3 w-3 text-primary" />
          {row.original.memberCount ?? 0} drivers
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        row.original.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
            <XCircle className="h-3 w-3" /> Inactive
          </span>
        )
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs cursor-pointer"
            onClick={() => onManageMembers(row.original)}
          >
            <Users className="h-3.5 w-3.5 text-primary" /> Members
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 cursor-pointer"
            title="Edit Group"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            title="Delete Group"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
