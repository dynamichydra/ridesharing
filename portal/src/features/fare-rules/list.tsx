import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { getFareRuleColumns } from "./column";
import { FareRuleFormDialog, DeleteFareRuleDialog } from "./dialog";
import {
  useFareRules,
  useCreateFareRule,
  useUpdateFareRule,
  useDeleteFareRule,
} from "./hooks";
import type { FareRuleFormValues } from "./schema";
import type { FareRule } from "./types";

const EMPTY_FORM: FareRuleFormValues = {
  name: "",
  ruleType: "time",
  multiplier: 1,
  description: "",
  zoneId: "",
  startTime: "",
  endTime: "",
  isActive: true,
  sortOrder: 0,
};

export default function FareRuleList() {
  // Filters
  const [ruleType, setRuleType] = useState<string>("");
  const [ruleTypeDraft, setRuleTypeDraft] = useState<string>("");
  const [page, setPage] = useState(1);

  // Dialog / selection state
  const [selectedRule, setSelectedRule] = useState<FareRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<FareRuleFormValues>(EMPTY_FORM);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Data + mutations
  const { data, isLoading } = useFareRules({
    page,
    limit: 10,
    ruleType: ruleType || undefined,
  });
  const createMutation = useCreateFareRule();
  const updateMutation = useUpdateFareRule();
  const deleteMutation = useDeleteFareRule();

  const rules = data?.MESSAGE || [];
  const pagination = data?.PAGINATION;

  const handleFilterSubmit = () => {
    setRuleType(ruleTypeDraft);
    setPage(1);
  };

  const handleFilterReset = () => {
    setRuleTypeDraft("");
    setRuleType("");
    setPage(1);
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setFormValues(EMPTY_FORM);
    setSelectedRule(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: FareRule) => {
    setFormMode("edit");
    setSelectedRule(rule);
    setFormValues({
      name: rule.name,
      ruleType: rule.ruleType,
      multiplier: Number(rule.multiplier),
      description: rule.description || "",
      zoneId: rule.zoneId || "",
      startTime: rule.startTime || "",
      endTime: rule.endTime || "",
      isActive: rule.isActive,
      sortOrder: rule.sortOrder || 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (rule: FareRule) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formValues.name,
      ruleType: formValues.ruleType,
      multiplier: Number(formValues.multiplier),
      description: formValues.description || undefined,
      zoneId: formValues.zoneId || undefined,
      startTime: formValues.startTime || undefined,
      endTime: formValues.endTime || undefined,
      isActive: formValues.isActive,
      sortOrder: formValues.sortOrder,
    };

    if (formMode === "create") {
      createMutation.mutate(payload, {
        onSuccess: () => setIsFormOpen(false),
      });
    } else if (selectedRule) {
      updateMutation.mutate(
        { id: selectedRule.id, payload },
        { onSuccess: () => setIsFormOpen(false) }
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedRule) return;
    deleteMutation.mutate(selectedRule.id, {
      onSuccess: () => setIsDeleteOpen(false),
    });
  };

  const columns = getFareRuleColumns({
    onEdit: handleOpenEdit,
    onDelete: handleOpenDelete,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading fare rules…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <Button
          onClick={handleOpenCreate}
          className="gap-2 shadow-sm font-semibold cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Fare Rule
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={ruleTypeDraft}
            onChange={(e) => setRuleTypeDraft(e.target.value)}
            className="bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">All Rule Types</option>
            <option value="time">Time-based</option>
            <option value="zone">Zone-based</option>
            <option value="traffic">Traffic-based</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex items-center shrink-0">
            <Button
              onClick={handleFilterSubmit}
              variant="outline"
              className="rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold cursor-pointer"
            >
              Filter
            </Button>
            <Button
              onClick={handleFilterReset}
              variant="outline"
              className="rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table — driven by column.tsx definitions */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground">
          <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-4 font-semibold ${col.headerClassName ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  No fare rules match your filters.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.cellClassName ?? ""}`}>
                      {col.render(rule)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <FareRuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <DeleteFareRuleDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        rule={selectedRule}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}