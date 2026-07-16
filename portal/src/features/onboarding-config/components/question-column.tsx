import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, ListPlus, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LookupOption, OnboardingQuestion } from "../types";

interface Props {
  countries: LookupOption[];
  onEdit: (q: OnboardingQuestion) => void;
  onManageOptions: (q: OnboardingQuestion) => void;
  onToggleActive: (q: OnboardingQuestion) => void;
}

const CHOICE_TYPES = new Set(["single_choice", "multiple_choice", "dropdown"]);

export function getQuestionColumns({
  countries,
  onEdit,
  onManageOptions,
  onToggleActive,
}: Props): ColumnDef<OnboardingQuestion>[] {
  return [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.code}</span>,
    },
    {
      accessorKey: "questionType",
      header: "Type",
      cell: ({ row }) => (
        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {row.original.questionType.replace(/_/g, " ")}
        </span>
      ),
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
      accessorKey: "isRequired",
      header: "Required",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.isRequired ? "Yes" : "No"}</span>
      ),
    },
    {
      id: "dependsOn",
      header: "Depends On",
      cell: ({ row }) =>
        row.original.dependsOnQuestionId ? (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.dependsOnQuestionId.slice(0, 8)}... {row.original.dependsOnOperator}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "sortOrder",
      header: "Sort",
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
          {CHOICE_TYPES.has(row.original.questionType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageOptions(row.original)}
              title="Manage options"
              className="cursor-pointer"
            >
              <ListPlus className="h-3.5 w-3.5" />
            </Button>
          )}
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
