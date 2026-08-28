import { useMemo, useState } from "react";
import { Percent, Plus } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Button } from "@/components/ui/button";

import { getCommissionRuleColumns } from "../components/column";
import { CommissionRuleDialog } from "../components/dialog";
import { useCommissionRules, useToggleCommissionRuleStatus } from "../hooks";
import type { CommissionRule } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  isActive: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "isActive",
    placeholder: "All Statuses",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
};

export default function CommissionRuleList() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useCommissionRules({
    isActive: controller.applied.isActive !== undefined ? controller.applied.isActive : "",
    page,
    limit,
  });

  const toggleStatusMutation = useToggleCommissionRuleStatus();

  const rules = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? rules.length;

  const handleEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (rule: CommissionRule) => {
    toggleStatusMutation.mutate({ id: rule.id, isActive: rule.isActive });
  };

  const columns = useMemo(
    () => getCommissionRuleColumns({ onEdit: handleEdit, onToggleStatus: handleToggleStatus }),
    [],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Percent className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Commission Rules
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Rules
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingRule(null);
            setIsDialogOpen(true);
          }}
          className="cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Rule
        </Button>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={rules}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <CommissionRuleDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingRule(null);
        }}
        ruleToEdit={editingRule}
      />
    </div>
  );
}
